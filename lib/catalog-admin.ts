import { ObjectId, type Db, type Document, type UpdateFilter } from "mongodb";
import { InputError } from "@/lib/errors";
import { releaseUnreferencedImages } from "@/lib/media";
import { assertStoredProduct, assertStoredTaxon } from "@/lib/models";
import { slugify } from "@/lib/slug";
import { CURRENCY, type CategoryDoc, type ProductDoc, type ProductImage } from "@/lib/types";
import type { ProductInput, TaxonomyInput } from "@/lib/validators";

export type TaxonKind = "category" | "collection";

const TAXON = {
  category: { collection: "categories", field: "categoryIds" },
  collection: { collection: "collections", field: "collectionIds" },
} as const;

export function parseStoredId(value: string, message: string) {
  if (!/^[a-f\d]{24}$/i.test(value)) throw new InputError(message, 404);
  return new ObjectId(value);
}

export async function listTaxons(db: Db, kind: TaxonKind) {
  const config = TAXON[kind];
  const [docs, counts] = await Promise.all([
    db.collection<CategoryDoc>(config.collection).find().sort({ sortOrder: 1, name: 1 }).toArray(),
    db
      .collection<ProductDoc>("products")
      .aggregate<{ _id: ObjectId; total: number; published: number }>([
        { $unwind: `$${config.field}` },
        {
          $group: {
            _id: `$${config.field}`,
            total: { $sum: 1 },
            published: { $sum: { $cond: ["$published", 1, 0] } },
          },
        },
      ])
      .toArray(),
  ]);
  const countById = new Map(counts.map((row) => [row._id.toHexString(), row]));
  return docs.map((doc) => {
    const count = countById.get(doc._id.toHexString());
    return {
      id: doc._id.toHexString(),
      slug: doc.slug,
      name: doc.name,
      description: doc.description,
      sortOrder: doc.sortOrder,
      published: doc.published,
      totalCount: count?.total ?? 0,
      publishedCount: count?.published ?? 0,
    };
  });
}

export async function getTaxon(db: Db, kind: TaxonKind, id: string) {
  const objectId = parseStoredId(id, `${label(kind)} not found`);
  const doc = await db.collection<CategoryDoc>(TAXON[kind].collection).findOne({ _id: objectId });
  if (!doc) throw new InputError(`${label(kind)} not found`, 404);
  return doc;
}

export async function createTaxon(db: Db, kind: TaxonKind, input: TaxonomyInput) {
  await assertSlugAvailable(db, kind, input.slug);
  const now = new Date();
  const doc: CategoryDoc = {
    _id: new ObjectId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await assertStoredTaxon(kind, doc);
  } catch {
    throw new InputError(`${label(kind)} could not be saved`);
  }
  await db.collection<CategoryDoc>(TAXON[kind].collection).insertOne(doc);
  return { id: doc._id.toHexString() };
}

export async function updateTaxon(db: Db, kind: TaxonKind, id: string, input: TaxonomyInput) {
  const objectId = parseStoredId(id, `${label(kind)} not found`);
  await assertSlugAvailable(db, kind, input.slug, objectId);
  const result = await db.collection<CategoryDoc>(TAXON[kind].collection).updateOne(
    { _id: objectId },
    { $set: { ...input, updatedAt: new Date() } },
  );
  if (!result.matchedCount) throw new InputError(`${label(kind)} not found`, 404);
}

export async function deleteTaxon(db: Db, kind: TaxonKind, id: string) {
  const objectId = parseStoredId(id, `${label(kind)} not found`);
  const config = TAXON[kind];
  const existing = await db.collection<CategoryDoc>(config.collection).findOne({ _id: objectId });
  if (!existing) throw new InputError(`${label(kind)} not found`, 404);
  const update = {
    $pull: { [config.field]: objectId },
    $set: { updatedAt: new Date() },
  } as UpdateFilter<ProductDoc>;
  await db.collection<ProductDoc>("products").updateMany({ [config.field]: objectId }, update);
  await db.collection<CategoryDoc>(config.collection).deleteOne({ _id: objectId });
}

export async function setMembership(db: Db, kind: TaxonKind, taxonId: string, productId: string, assigned: boolean) {
  const config = TAXON[kind];
  const taxonObjectId = parseStoredId(taxonId, `${label(kind)} not found`);
  const productObjectId = parseStoredId(productId, "Product not found");
  const taxon = await db.collection(config.collection).findOne({ _id: taxonObjectId });
  if (!taxon) throw new InputError(`${label(kind)} not found`, 404);
  const product = await db.collection<ProductDoc>("products").findOne({ _id: productObjectId });
  if (!product) throw new InputError("Product not found", 404);
  const update = (
    assigned
      ? { $addToSet: { [config.field]: taxonObjectId }, $set: { updatedAt: new Date() } }
      : { $pull: { [config.field]: taxonObjectId }, $set: { updatedAt: new Date() } }
  ) as UpdateFilter<ProductDoc>;
  await db.collection<ProductDoc>("products").updateOne({ _id: productObjectId }, update);
}

export async function assignedProducts(db: Db, kind: TaxonKind, taxonId: string) {
  const objectId = parseStoredId(taxonId, `${label(kind)} not found`);
  const field = TAXON[kind].field;
  const docs = await db
    .collection<ProductDoc>("products")
    .find({ [field]: objectId })
    .project<{ _id: ObjectId; name: string; published: boolean }>({ name: 1, published: 1 })
    .sort({ name: 1 })
    .limit(500)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    name: doc.name,
    published: doc.published,
  }));
}

async function assertSlugAvailable(db: Db, kind: TaxonKind, slug: string, currentId?: ObjectId) {
  const clash = await db.collection<CategoryDoc>(TAXON[kind].collection).findOne({
    slug,
    ...(currentId ? { _id: { $ne: currentId } } : {}),
  });
  if (clash) throw new InputError("That address is already in use", 409);
}

function label(kind: TaxonKind) {
  return kind === "category" ? "Category" : "Collection";
}

export async function createProduct(db: Db, input: ProductInput) {
  const categoryIds = await existingIds(db, "categories", input.categoryIds, "Choose categories that exist");
  const collectionIds = await existingIds(db, "collections", input.collectionIds, "Choose collections that exist");
  const slug = await allocateSlug(db, input.slug || slugify(input.name) || "shawl", { exact: Boolean(input.slug) });
  await assertSkuAvailable(db, input.sku);
  const now = new Date();
  const publication = publicationState(input, null, now);
  const doc: ProductDoc = {
    _id: new ObjectId(),
    slug,
    sku: input.sku,
    name: input.name,
    summary: input.summary,
    description: input.description,
    price: input.price,
    currency: CURRENCY,
    designType: input.designType,
    material: input.material,
    colors: input.colors,
    techniques: input.techniques,
    verifiedOrigin: input.verifiedOrigin,
    stockStatus: input.stockStatus,
    stockQuantity: input.stockQuantity,
    categoryIds,
    collectionIds,
    featured: input.featured,
    featuredRank: input.featuredRank,
    published: publication.published,
    publishedAt: publication.publishedAt,
    archived: publication.archived,
    images: storedImages(input.images),
    createdAt: now,
    updatedAt: now,
  };
  await assertProduct(doc);
  await db.collection<ProductDoc>("products").insertOne(doc);
  return { id: doc._id.toHexString(), slug };
}

export async function updateProduct(db: Db, id: string, input: ProductInput) {
  const objectId = parseStoredId(id, "Product not found");
  const current = await db.collection<ProductDoc>("products").findOne({ _id: objectId });
  if (!current) throw new InputError("Product not found", 404);
  const categoryIds = await existingIds(db, "categories", input.categoryIds, "Choose categories that exist");
  const collectionIds = await existingIds(db, "collections", input.collectionIds, "Choose collections that exist");
  const preferred = input.slug || slugify(input.name) || "shawl";
  const slug = await allocateSlug(db, preferred, { exact: Boolean(input.slug), currentId: objectId });
  await assertSkuAvailable(db, input.sku, objectId);
  const now = new Date();
  const publication = publicationState(input, current.publishedAt, now);
  const images = storedImages(input.images);
  const next: ProductDoc = {
    ...current,
    slug,
    sku: input.sku,
    name: input.name,
    summary: input.summary,
    description: input.description,
    price: input.price,
    currency: CURRENCY,
    designType: input.designType,
    material: input.material,
    colors: input.colors,
    techniques: input.techniques,
    verifiedOrigin: input.verifiedOrigin,
    stockStatus: input.stockStatus,
    stockQuantity: input.stockQuantity,
    categoryIds,
    collectionIds,
    featured: input.featured,
    featuredRank: input.featuredRank,
    published: publication.published,
    publishedAt: publication.publishedAt,
    archived: publication.archived,
    images,
    updatedAt: now,
  };
  await assertProduct(next);
  await db.collection<ProductDoc>("products").replaceOne({ _id: objectId }, next);
  const removed = imageIds(current.images).filter((publicId) => !imageIds(images).includes(publicId));
  const released = await releaseUnreferencedImages(db, removed);
  return { id, slug, warning: released.warnings[0] };
}

export async function deleteProduct(db: Db, id: string) {
  const objectId = parseStoredId(id, "Product not found");
  const current = await db.collection<ProductDoc>("products").findOne({ _id: objectId });
  if (!current) throw new InputError("Product not found", 404);
  const result = await db.collection<ProductDoc>("products").deleteOne({ _id: objectId });
  if (!result.deletedCount) throw new InputError("Product not found", 404);
  const released = await releaseUnreferencedImages(db, imageIds(current.images));
  return { warning: released.warnings[0] };
}

export async function adjustStock(db: Db, id: string, delta: number) {
  const objectId = parseStoredId(id, "Product not found");
  const products = db.collection<ProductDoc>("products");
  const now = new Date();
  if (delta > 0) {
    const updated = await products.findOneAndUpdate(
      { _id: objectId, stockQuantity: { $gte: 0 } },
      { $inc: { stockQuantity: delta }, $set: { updatedAt: now } },
      { returnDocument: "after" },
    );
    if (!updated) throw new InputError("Quantity is not tracked for this piece");
    return { stockQuantity: updated.stockQuantity };
  }
  const updated = await products.findOneAndUpdate(
    { _id: objectId, stockQuantity: { $gte: -delta } },
    [
      {
        $set: {
          stockQuantity: { $add: ["$stockQuantity", delta] },
          updatedAt: now,
          stockStatus: {
            $cond: [{ $lte: [{ $add: ["$stockQuantity", delta] }, 0] }, "sold_out", "$stockStatus"],
          },
        },
      },
    ],
    { returnDocument: "after" },
  );
  if (!updated) throw new InputError("Not enough pieces in stock");
  return { stockQuantity: updated.stockQuantity };
}

export async function getProduct(db: Db, id: string) {
  const objectId = parseStoredId(id, "Product not found");
  const doc = await db.collection<ProductDoc>("products").findOne({ _id: objectId });
  if (!doc) throw new InputError("Product not found", 404);
  return doc;
}

export async function listAdminProducts(db: Db, args: { page: number; q: string }) {
  const pageSize = 20;
  const filter: Document = {};
  if (args.q) filter.name = { $regex: escapeRegex(args.q), $options: "i" };
  const products = db.collection<ProductDoc>("products");
  const [total, docs, categories, collections] = await Promise.all([
    products.countDocuments(filter),
    products
      .find(filter)
      .project({
        name: 1,
        slug: 1,
        price: 1,
        published: 1,
        archived: 1,
        categoryIds: 1,
        collectionIds: 1,
        updatedAt: 1,
      })
      .sort({ updatedAt: -1, _id: 1 })
      .skip((args.page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection<CategoryDoc>("categories").find().project({ name: 1 }).toArray(),
    db.collection<CategoryDoc>("collections").find().project({ name: 1 }).toArray(),
  ]);
  const categoryNames = new Map(categories.map((item) => [item._id.toHexString(), item.name]));
  const collectionNames = new Map(collections.map((item) => [item._id.toHexString(), item.name]));
  return {
    total,
    pageSize,
    products: docs.map((doc) => ({
      id: doc._id.toHexString(),
      name: doc.name,
      slug: doc.slug,
      price: doc.price,
      published: doc.published,
      archived: Boolean(doc.archived),
      categories: ((doc.categoryIds ?? []) as ObjectId[]).map((id) => categoryNames.get(id.toHexString())).filter(Boolean),
      collections: ((doc.collectionIds ?? []) as ObjectId[]).map((id) => collectionNames.get(id.toHexString())).filter(Boolean),
    })),
  };
}

export async function searchProductSummaries(db: Db, q: string) {
  const filter: Document = {};
  if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };
  const docs = await db
    .collection<ProductDoc>("products")
    .find(filter)
    .project({ name: 1, published: 1, categoryIds: 1, collectionIds: 1 })
    .sort({ name: 1 })
    .limit(20)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    name: doc.name,
    published: doc.published,
    categoryIds: ((doc.categoryIds ?? []) as ObjectId[]).map((id) => id.toHexString()),
    collectionIds: ((doc.collectionIds ?? []) as ObjectId[]).map((id) => id.toHexString()),
  }));
}

export async function taxonChoices(db: Db) {
  const [categories, collections] = await Promise.all([
    db.collection<CategoryDoc>("categories").find().sort({ sortOrder: 1, name: 1 }).project({ name: 1 }).toArray(),
    db.collection<CategoryDoc>("collections").find().sort({ sortOrder: 1, name: 1 }).project({ name: 1 }).toArray(),
  ]);
  return {
    categories: categories.map((item) => ({ id: item._id.toHexString(), name: item.name })),
    collections: collections.map((item) => ({ id: item._id.toHexString(), name: item.name })),
  };
}

async function existingIds(db: Db, collection: "categories" | "collections", ids: string[], message: string) {
  const objectIds = ids.map((id) => new ObjectId(id));
  if (!objectIds.length) return [];
  const found = await db
    .collection(collection)
    .find({ _id: { $in: objectIds } })
    .project({ _id: 1 })
    .toArray();
  if (found.length !== objectIds.length) throw new InputError(message);
  return objectIds;
}

async function allocateSlug(
  db: Db,
  preferred: string,
  options: { exact: boolean; currentId?: ObjectId },
) {
  const products = db.collection<ProductDoc>("products");
  const exclude = options.currentId ? { _id: { $ne: options.currentId } } : {};
  if (options.exact) {
    const clash = await products.findOne({ slug: preferred, ...exclude });
    if (clash) throw new InputError("That address is already in use", 409);
    return preferred;
  }
  let slug = preferred || "shawl";
  for (let n = 2; n < 100; n += 1) {
    const clash = await products.findOne({ slug, ...exclude });
    if (!clash) return slug;
    slug = `${preferred}-${n}`.slice(0, 80).replace(/-+$/g, "");
  }
  throw new InputError("Choose a different name");
}

function storedImages(images: ProductInput["images"]): ProductImage[] {
  const stored = images.map((image, index) => ({
    url: image.url,
    alt: image.alt,
    publicId: image.publicId,
    role: image.role,
    sortOrder: index,
    primary: image.primary,
  }));
  if (stored.length && !stored.some((image) => image.primary)) stored[0].primary = true;
  let chosen = false;
  for (const image of stored) {
    if (!image.primary || chosen) image.primary = false;
    else chosen = true;
  }
  if (stored.length && !stored.some((image) => image.primary)) stored[0].primary = true;
  return stored;
}

function publicationState(input: ProductInput, currentPublishedAt: Date | null, now: Date) {
  const archived = input.archived;
  const published = archived ? false : input.published;
  return {
    archived,
    published,
    publishedAt: published ? currentPublishedAt ?? now : null,
  };
}

function imageIds(images: ProductImage[] | undefined) {
  return (images ?? []).map((image) => image.publicId).filter((publicId): publicId is string => Boolean(publicId));
}

async function assertSkuAvailable(db: Db, sku: string | null, currentId?: ObjectId) {
  if (!sku) return;
  const clash = await db.collection<ProductDoc>("products").findOne({
    sku,
    ...(currentId ? { _id: { $ne: currentId } } : {}),
  });
  if (clash) throw new InputError("That SKU is already in use", 409);
}

async function assertProduct(doc: ProductDoc) {
  try {
    await assertStoredProduct(doc);
  } catch {
    throw new InputError("That piece could not be saved");
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
