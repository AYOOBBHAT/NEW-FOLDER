import type { Db } from "mongodb";

export const CATEGORY_SEED = [
  {
    slug: "embroidered-shawls",
    name: "Embroidered Shawls",
    description:
      "Shawls grouped for their embroidery. Fibre, technique, and origin stay on each piece, and only when they have been verified.",
    sortOrder: 0,
  },
  {
    slug: "plain-and-minimal-shawls",
    name: "Plain & Minimal Shawls",
    description: "Shawls with little or no surface pattern, kept aside from embroidered and traditional edits.",
    sortOrder: 1,
  },
  {
    slug: "traditional-designs",
    name: "Traditional Designs",
    description:
      "Shawls whose designs follow established traditions. Membership is editorial and does not by itself verify craft or fibre.",
    sortOrder: 2,
  },
] as const;

export const COLLECTION_SEED = [
  {
    slug: "gift-worthy-picks",
    name: "Gift-Worthy Picks",
    description: "A curated edit of pieces suited to giving. Placement here is a merchandising choice.",
    sortOrder: 0,
  },
  {
    slug: "signature-collection",
    name: "Signature Collection",
    description: "Pieces chosen to stand for the house. A shawl can also remain in its categories.",
    sortOrder: 1,
  },
  {
    slug: "new-arrivals",
    name: "New Arrivals",
    description: "A hand-edited set of recent pieces. This list is separate from the newest sort order.",
    sortOrder: 2,
  },
] as const;

export async function seedTaxonomy(db: Db) {
  const now = new Date();
  for (const category of CATEGORY_SEED) {
    await db.collection("categories").updateOne(
      { slug: category.slug },
      { $setOnInsert: { ...category, published: true, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
  }
  for (const collection of COLLECTION_SEED) {
    await db.collection("collections").updateOne(
      { slug: collection.slug },
      { $setOnInsert: { ...collection, published: true, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
  }
}

export async function markTaxonomySeeded(db: Db) {
  await db.collection<{ _id: string; seededAt: Date }>("meta").updateOne(
    { _id: "taxonomy" },
    { $set: { seededAt: new Date() } },
    { upsert: true },
  );
}
