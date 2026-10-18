import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { adjustStock, createProduct } from "@/lib/catalog-admin";
import { defaultCatalogueQuery } from "@/lib/catalogue-params";
import { queryCatalogue } from "@/lib/catalogue-query";
import { inspectImage } from "@/lib/cloudinary";
import { InputError } from "@/lib/errors";
import { releaseUnreferencedImages } from "@/lib/media";
import { assertStoredProduct } from "@/lib/models";
import { prepareDatabase } from "@/lib/mongodb";
import type { ProductDoc } from "@/lib/types";
import { parseInput, productInputSchema } from "@/lib/validators";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("persistence and images", { timeout: 180_000, concurrency: 1 }, () => {
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

  it("keeps a product after the client reconnects", async () => {
    const input = parseInput(productInputSchema, productPayload("reconnect-shawl"));
    const created = await createProduct(db, input);
    await client.close();
    client = new MongoClient(server.getUri());
    await client.connect();
    db = client.db("kashmir_shawls");
    const stored = await db.collection<ProductDoc>("products").findOne({ slug: "reconnect-shawl" });
    assert.equal(stored?._id.toHexString(), created.id);
    assert.equal(stored?.price, 12000);
  });

  it("hides archived products and adjusts stock atomically", async () => {
    const input = parseInput(productInputSchema, { ...productPayload("counted-shawl"), stockQuantity: 1, archived: true, published: true });
    const created = await createProduct(db, input);
    const stored = await db.collection<ProductDoc>("products").findOne({ _id: new ObjectId(created.id) });
    assert.equal(stored?.archived, true);
    assert.equal(stored?.published, false);
    await db.collection("products").updateOne({ _id: stored?._id }, { $set: { archived: false, published: true, stockQuantity: 1 } });
    const visible = await queryCatalogue(db, { categoryId: null, collectionId: null, query: defaultCatalogueQuery() });
    assert.equal(visible.products.some((item) => item.slug === "counted-shawl"), true);
    await db.collection("products").updateOne({ _id: stored?._id }, { $set: { archived: true, published: true } });
    const hidden = await queryCatalogue(db, { categoryId: null, collectionId: null, query: defaultCatalogueQuery() });
    assert.equal(hidden.products.some((item) => item.slug === "counted-shawl"), false);
    assert.equal((await adjustStock(db, created.id, -1)).stockQuantity, 0);
    await assert.rejects(() => adjustStock(db, created.id, -1), (error: unknown) => error instanceof InputError);
    const after = await db.collection<ProductDoc>("products").findOne({ _id: new ObjectId(created.id) });
    assert.equal(after?.stockQuantity, 0);
    assert.equal(after?.stockStatus, "sold_out");
  });

  it("deletes a hosted photograph only when no product still references it", async () => {
    const removed: string[] = [];
    const publicId = "shawl-house/products/shared-photo";
    await db.collection("products").insertMany([await imageProduct("shared-a", publicId), await imageProduct("shared-b", publicId)]);
    const first = await releaseUnreferencedImages(db, [publicId], async (id) => {
      removed.push(id);
    });
    assert.deepEqual(first.deleted, []);
    assert.deepEqual(first.warnings, []);
    assert.equal(removed.length, 0);
    await db.collection("products").deleteOne({ slug: "shared-a" });
    await releaseUnreferencedImages(db, [publicId], async (id) => {
      removed.push(id);
    });
    assert.equal(removed.length, 0);
    await db.collection("products").deleteOne({ slug: "shared-b" });
    await releaseUnreferencedImages(db, [publicId], async (id) => {
      removed.push(id);
    });
    assert.deepEqual(removed, [publicId]);
  });

  it("accepts a real PNG and rejects other files", () => {
    assert.equal(inspectImage(PNG, "image/png"), "png");
    assert.throws(() => inspectImage(Buffer.from("<html></html>"), "image/png"), InputError);
    assert.throws(() => inspectImage(PNG, "image/jpeg"), InputError);
  });
});

function productPayload(slug: string) {
  return {
    name: "Persisted shawl",
    slug,
    summary: "",
    description: "",
    price: 12000,
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
    featuredRank: 10,
    published: true,
    images: [],
  };
}

async function imageProduct(slug: string, publicId: string): Promise<ProductDoc> {
  const now = new Date();
  const doc = {
    _id: new ObjectId(),
    slug,
    name: slug,
    summary: "",
    description: "",
    price: 1000,
    currency: "INR" as const,
    designType: null,
    material: null,
    colors: [],
    techniques: [],
    verifiedOrigin: null,
    stockStatus: "in_stock" as const,
    stockQuantity: null,
    categoryIds: [],
    collectionIds: [],
    featured: false,
    featuredRank: 1,
    published: false,
    publishedAt: null,
    archived: false,
    sku: null,
    images: [
      {
        url: "https://res.cloudinary.com/example/image/upload/v1/shawl-house/products/shared-photo.jpg",
        alt: "Folded shawl",
        publicId,
        role: "detail" as const,
        sortOrder: 0,
        primary: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  await assertStoredProduct(doc);
  return doc;
}
