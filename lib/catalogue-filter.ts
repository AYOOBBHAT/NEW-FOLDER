import { type Document, type Sort } from "mongodb";
import { PAGE_SIZE, type CatalogueQuery } from "@/lib/catalogue-params";
import { CURRENCY, type ProductDoc, type PublicProductCard } from "@/lib/types";
import {
  COLORS,
  DESIGN_TYPES,
  MATERIALS,
  STOCK_STATUSES,
  TECHNIQUES,
  type SortKey,
  type StockStatus,
} from "@/lib/vocab";

const ALLOWED_SORT_FIELDS = new Set(["featured", "featuredRank", "createdAt", "price", "_id"]);

const SORTS: Record<SortKey, Sort> = {
  featured: { featured: -1, featuredRank: 1, createdAt: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
};

export function safeSort(sort: SortKey): Sort {
  const value = SORTS[sort];
  if (!value) throw new Error("Unsafe sort");
  for (const [key, direction] of Object.entries(value)) {
    if (!ALLOWED_SORT_FIELDS.has(key) || (direction !== 1 && direction !== -1)) {
      throw new Error("Unsafe sort");
    }
  }
  return value;
}

export function visibleProduct(): Document {
  return { published: true, archived: { $ne: true } };
}

export function scopeFilter(categoryId: unknown, collectionId: unknown): Document {
  const filter: Document = visibleProduct();
  if (categoryId) filter.categoryIds = categoryId;
  if (collectionId) filter.collectionIds = collectionId;
  return filter;
}

export function productFilter(scope: Document, query: CatalogueQuery): Document {
  const filter: Document = { ...scope };
  if (query.materials.length) filter.material = { $in: query.materials };
  if (query.designTypes.length) filter.designType = { $in: query.designTypes };
  if (query.colors.length) filter.colors = { $in: query.colors };
  if (query.techniques.length) filter.techniques = { $in: query.techniques };
  if (query.availability.length) filter.stockStatus = { $in: query.availability };
  if (query.minPrice != null || query.maxPrice != null) {
    const price: Document = {};
    if (query.minPrice != null) price.$gte = query.minPrice;
    if (query.maxPrice != null) price.$lte = query.maxPrice;
    filter.price = price;
  }
  filter.published = true;
  filter.archived = { $ne: true };
  return filter;
}

export function preferredImage(images: ProductDoc["images"] | undefined) {
  const usable = (images ?? []).filter((item) => item?.url?.startsWith("https://") && item.alt);
  return [...usable].sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0] ?? null;
}

export function toPublicCard(doc: ProductDoc): PublicProductCard {
  const image = preferredImage(doc.images);
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    name: doc.name,
    summary: doc.summary ?? "",
    price: doc.price,
    currency: CURRENCY,
    designType: controlled(doc.designType, DESIGN_TYPES),
    material: controlled(doc.material, MATERIALS),
    colors: controlledList(doc.colors, COLORS),
    techniques: controlledList(doc.techniques, TECHNIQUES),
    stockStatus: (controlled(doc.stockStatus, STOCK_STATUSES) ?? "in_stock") as StockStatus,
    image: image ? { url: image.url, alt: image.alt } : null,
  };
}

export function catalogueSkip(page: number) {
  return (page - 1) * PAGE_SIZE;
}

function controlled(value: unknown, allowed: ReadonlySet<string>) {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function controlledList(value: unknown, allowed: ReadonlySet<string>) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && allowed.has(item));
}
