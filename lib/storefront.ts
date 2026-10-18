import { cache } from "react";
import type { ObjectId } from "mongodb";
import { presentFacets, toURLSearchParams, type CatalogueQuery } from "@/lib/catalogue-params";
import { visibleProduct } from "@/lib/catalogue-filter";
import { queryCatalogue } from "@/lib/catalogue-query";
import { getDb } from "@/lib/mongodb";
import { CURRENCY, type CategoryDoc, type ProductDoc, type PublicTaxon } from "@/lib/types";
import {
  COLORS,
  DESIGN_TYPES,
  MATERIALS,
  STOCK_STATUSES,
  TECHNIQUES,
  type StockStatus,
} from "@/lib/vocab";

export type CatalogueScope =
  | { type: "shop" }
  | { type: "category"; slug: string }
  | { type: "collection"; slug: string };

const findPublishedTaxon = cache(async (collection: "categories" | "collections", slug: string) => {
  const db = await getDb();
  return db.collection<CategoryDoc>(collection).findOne({ slug, published: true });
});

export async function getPublishedCategory(slug: string) {
  return findPublishedTaxon("categories", slug);
}

export async function getPublishedCollection(slug: string) {
  return findPublishedTaxon("collections", slug);
}

export const getPublishedTaxonomy = cache(async () => {
  const db = await getDb();
  const [categories, collections, categoryCounts, collectionCounts, shopCount] = await Promise.all([
    db.collection<CategoryDoc>("categories").find({ published: true }).sort({ sortOrder: 1, name: 1 }).toArray(),
    db.collection<CategoryDoc>("collections").find({ published: true }).sort({ sortOrder: 1, name: 1 }).toArray(),
    countMembership(db, "categoryIds"),
    countMembership(db, "collectionIds"),
    db.collection<ProductDoc>("products").countDocuments(visibleProduct()),
  ]);
  return {
    shopCount,
    categories: categories.map((doc) => toPublicTaxon(doc, "/categories", categoryCounts)),
    collections: collections.map((doc) => toPublicTaxon(doc, "/collections", collectionCounts)),
  };
});

export async function loadCatalogue(scope: CatalogueScope, query: CatalogueQuery) {
  const db = await getDb();
  let categoryId: ObjectId | null = null;
  let collectionId: ObjectId | null = null;
  let title = "Shop all";
  let description = "The full catalogue. Each shawl is listed once, however many categories it belongs to.";
  let eyebrow = "Catalogue";
  let pathname = "/shop";

  if (scope.type === "category") {
    const category = await getPublishedCategory(scope.slug);
    if (!category) return { type: "not_found" as const };
    categoryId = category._id;
    title = category.name;
    description = category.description;
    eyebrow = "Category";
    pathname = `/categories/${category.slug}`;
  }

  if (scope.type === "collection") {
    const collection = await getPublishedCollection(scope.slug);
    if (!collection) return { type: "not_found" as const };
    collectionId = collection._id;
    title = collection.name;
    description = collection.description;
    eyebrow = "Collection";
    pathname = `/collections/${collection.slug}`;
  }

  const result = await queryCatalogue(db, { categoryId, collectionId, query });
  return {
    type: "ok" as const,
    title,
    description,
    eyebrow,
    pathname,
    products: result.products,
    total: result.total,
    scopeCount: result.scopeCount,
    facets: presentFacets(result.rawFacets),
    query,
  };
}

export const getPublicProduct = cache(async (slug: string, includeUnpublished: boolean) => {
  const db = await getDb();
  const filter = includeUnpublished ? { slug } : { slug, ...visibleProduct() };
  const doc = await db.collection<ProductDoc>("products").findOne(filter);
  if (!doc) return null;
  const [categories, collections] = await Promise.all([
    doc.categoryIds.length
      ? db
          .collection<CategoryDoc>("categories")
          .find({ _id: { $in: doc.categoryIds }, published: true })
          .sort({ sortOrder: 1, name: 1 })
          .toArray()
      : Promise.resolve([]),
    doc.collectionIds.length
      ? db
          .collection<CategoryDoc>("collections")
          .find({ _id: { $in: doc.collectionIds }, published: true })
          .sort({ sortOrder: 1, name: 1 })
          .toArray()
      : Promise.resolve([]),
    ]);
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    name: doc.name,
    summary: doc.summary,
    description: doc.description,
    price: doc.price,
    currency: CURRENCY,
    designType: controlled(doc.designType, DESIGN_TYPES),
    material: controlled(doc.material, MATERIALS),
    colors: controlledList(doc.colors, COLORS),
    techniques: controlledList(doc.techniques, TECHNIQUES),
    verifiedOrigin: typeof doc.verifiedOrigin === "string" && doc.verifiedOrigin.trim() ? doc.verifiedOrigin.trim() : null,
    stockStatus: (controlled(doc.stockStatus, STOCK_STATUSES) ?? "in_stock") as StockStatus,
    stockQuantity: typeof doc.stockQuantity === "number" ? doc.stockQuantity : null,
    published: doc.published,
    images: (doc.images ?? [])
      .filter((image) => image?.url?.startsWith("https://") && image.alt)
      .sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((image) => ({
        url: image.url,
        alt: image.alt,
        role: image.role === "model" || image.role === "detail" ? image.role : ("product" as const),
      })),
    categories: categories.map((item) => ({ name: item.name, href: `/categories/${item.slug}` })),
    collections: collections.map((item) => ({ name: item.name, href: `/collections/${item.slug}` })),
  };
});

export function readSearchParams(raw: Record<string, string | string[] | undefined>) {
  return toURLSearchParams(raw);
}

async function countMembership(
  db: Awaited<ReturnType<typeof getDb>>,
  field: "categoryIds" | "collectionIds",
) {
  const rows = await db
    .collection<ProductDoc>("products")
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: visibleProduct() },
      { $unwind: `$${field}` },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((row) => [row._id.toHexString(), row.count]));
}

function toPublicTaxon(doc: CategoryDoc, prefix: string, counts: Map<string, number>): PublicTaxon {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    href: `${prefix}/${doc.slug}`,
    productCount: counts.get(doc._id.toHexString()) ?? 0,
  };
}

function controlled(value: unknown, allowed: ReadonlySet<string>) {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function controlledList(value: unknown, allowed: ReadonlySet<string>) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && allowed.has(item));
}
