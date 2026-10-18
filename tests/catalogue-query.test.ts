import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createProduct, deleteTaxon, setMembership } from "@/lib/catalog-admin";
import { defaultCatalogueQuery } from "@/lib/catalogue-params";
import { queryCatalogue } from "@/lib/catalogue-query";
import { prepareDatabase } from "@/lib/mongodb";
import { seedTaxonomy } from "@/lib/seed";
import type { ProductDoc } from "@/lib/types";
import { parseInput, productInputSchema } from "@/lib/validators";

describe("catalogue queries", { timeout: 180_000, concurrency: 1 }, () => {
  let server: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  before(async () => {
    server = await MongoMemoryServer.create();
    client = new MongoClient(server.getUri());
    await client.connect();
    db = client.db("kashmir_shawls");
    await prepareDatabase(db);
  });

  after(async () => {
    await client?.close();
    await server?.stop();
  });

  it("seeds taxonomy documents and does not invent products", async () => {
    await seedTaxonomy(db);
    assert.equal(await db.collection("categories").countDocuments(), 3);
    assert.equal(await db.collection("collections").countDocuments(), 3);
    assert.equal(await db.collection("products").countDocuments(), 0);
    const indexes = await db.collection("products").indexes();
    assert.equal(indexes.some((index) => index.name === "products_slug" && index.unique), true);
    assert.equal(indexes.some((index) => index.name === "products_sku" && index.unique), true);
    assert.equal(indexes.some((index) => index.name === "products_featured_sort"), true);
  });

  it("lists one product once when it belongs to two categories", async () => {
    const categories = await db.collection("categories").find().sort({ sortOrder: 1 }).toArray();
    const embroidered = categories[0]._id;
    const plain = categories[1]._id;
    const hidden = await insertProduct(db, {
      slug: "hidden-shawl",
      name: "Hidden shawl",
      published: false,
      categoryIds: [embroidered],
      material: "pashmina",
      price: 9000,
    });
    const shared = await insertProduct(db, {
      slug: "shared-shawl",
      name: "Shared shawl",
      published: true,
      categoryIds: [embroidered, plain],
      material: null,
      colors: ["ivory"],
      price: 22000,
      featured: true,
      featuredRank: 1,
    });
    await insertProduct(db, {
      slug: "second-shawl",
      name: "Second shawl",
      published: true,
      categoryIds: [plain],
      material: "wool",
      colors: ["navy"],
      price: 12000,
      stockStatus: "made_to_order",
      featured: false,
    });

    const shop = await queryCatalogue(db, { categoryId: null, collectionId: null, query: defaultCatalogueQuery() });
    assert.equal(shop.total, 2);
    assert.equal(shop.products.some((product) => product.slug === hidden.slug), false);
    assert.equal(shop.products[0]?.slug, "shared-shawl");
    assert.deepEqual(shop.rawFacets.materials.map((item) => item.value).sort(), ["wool"]);
    assert.deepEqual(shop.rawFacets.colors.map((item) => item.value).sort(), ["ivory", "navy"]);
    assert.equal(shop.rawFacets.materials.some((item) => item.value === "pashmina"), false);

    const embroideredResult = await queryCatalogue(db, {
      categoryId: embroidered,
      collectionId: null,
      query: defaultCatalogueQuery(),
    });
    assert.equal(embroideredResult.total, 1);
    assert.equal(embroideredResult.products[0]?.id, shared.id);

    const plainResult = await queryCatalogue(db, {
      categoryId: plain,
      collectionId: null,
      query: { ...defaultCatalogueQuery(), sort: "price_asc" },
    });
    assert.deepEqual(plainResult.products.map((product) => product.price), [12000, 22000]);

    const filtered = await queryCatalogue(db, {
      categoryId: null,
      collectionId: null,
      query: { ...defaultCatalogueQuery(), materials: ["wool"], availability: ["made_to_order"] },
    });
    assert.equal(filtered.total, 1);
    assert.equal(filtered.products[0]?.slug, "second-shawl");
  });

  it("paginates without duplicating records", async () => {
    const existing = await db.collection("products").countDocuments({ published: true });
    const needed = 13 - existing;
    for (let index = 0; index < needed; index += 1) {
      await insertProduct(db, {
        slug: `page-shawl-${index}`,
        name: `Page shawl ${index}`,
        published: true,
        price: 3000 + index,
        createdAt: new Date(Date.now() - index * 1000),
      });
    }
    const page1 = await queryCatalogue(db, {
      categoryId: null,
      collectionId: null,
      query: { ...defaultCatalogueQuery(), sort: "newest" },
    });
    const page2 = await queryCatalogue(db, {
      categoryId: null,
      collectionId: null,
      query: { ...defaultCatalogueQuery(), sort: "newest", page: 2 },
    });
    assert.equal(page1.products.length, 12);
    assert.equal(page2.products.length, page1.total - 12);
    const ids = new Set([...page1.products, ...page2.products].map((product) => product.id));
    assert.equal(ids.size, page1.products.length + page2.products.length);
  });

  it("assigns a category by updating one product record", async () => {
    const before = await db.collection("products").countDocuments();
    const category = await db.collection("categories").findOne({ slug: "traditional-designs" });
    const product = await db.collection<ProductDoc>("products").findOne({ slug: "shared-shawl" });
    assert.ok(category && product);
    await setMembership(db, "category", category._id.toHexString(), product._id.toHexString(), true);
    await setMembership(db, "category", category._id.toHexString(), product._id.toHexString(), true);
    const updated = await db.collection<ProductDoc>("products").findOne({ _id: product._id });
    assert.equal(await db.collection("products").countDocuments(), before);
    assert.equal(updated?.categoryIds.filter((id) => id.equals(category._id)).length, 1);
    await deleteTaxon(db, "category", category._id.toHexString());
    const afterDelete = await db.collection<ProductDoc>("products").findOne({ _id: product._id });
    assert.equal(afterDelete?.categoryIds.some((id) => id.equals(category._id)), false);
    assert.equal(await db.collection("products").countDocuments(), before);
    await seedTaxonomy(db);
  });

  it("stores verified attributes only from the admin payload", async () => {
    const category = await db.collection("categories").findOne({ slug: "embroidered-shawls" });
    assert.ok(category);
    const input = parseInput(productInputSchema, {
      name: "Recorded shawl",
      slug: "recorded-shawl",
      summary: "A summary written by hand.",
      description: "",
      price: 15000,
      designType: "border",
      material: "pashmina",
      colors: ["ivory"],
      techniques: ["sozni"],
      verifiedOrigin: null,
      stockStatus: "in_stock",
      stockQuantity: 1,
      categoryIds: [category._id.toHexString(), category._id.toHexString()],
      collectionIds: [],
      featured: false,
      featuredRank: 10,
      published: true,
      images: [{ url: "https://cdn.example.com/recorded.jpg", alt: "Shawl folded on linen" }],
    });
    const created = await createProduct(db, input);
    const stored = await db.collection<ProductDoc>("products").findOne({ _id: new ObjectId(created.id) });
    assert.equal(stored?.material, "pashmina");
    assert.deepEqual(stored?.images, [
      {
        url: "https://cdn.example.com/recorded.jpg",
        alt: "Shawl folded on linen",
        publicId: null,
        role: "product",
        sortOrder: 0,
        primary: true,
      },
    ]);
    assert.equal(stored?.categoryIds.length, 1);
    assert.equal(await db.collection("products").countDocuments({ slug: "recorded-shawl" }), 1);
  });
});

async function insertProduct(db: Db, overrides: Partial<ProductDoc> & { slug: string; name: string }) {
  const now = new Date();
  const doc: ProductDoc = {
    _id: new ObjectId(),
    summary: "",
    description: "",
    price: 10000,
    currency: "INR",
    designType: null,
    material: null,
    colors: [],
    techniques: [],
    verifiedOrigin: null,
    stockStatus: "in_stock",
    stockQuantity: null,
    categoryIds: [],
    collectionIds: [],
    featured: false,
    featuredRank: 100,
    published: true,
    publishedAt: now,
    images: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await db.collection<ProductDoc>("products").insertOne(doc);
  return { id: doc._id.toHexString(), slug: doc.slug };
}
