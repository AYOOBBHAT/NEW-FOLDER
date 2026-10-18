import type { ObjectId } from "mongodb";
import type { StockStatus } from "@/lib/vocab";

export const CURRENCY = "INR" as const;

export const IMAGE_ROLES = ["product", "model", "detail"] as const;
export type ImageRole = (typeof IMAGE_ROLES)[number];

export type ProductImage = {
  url: string;
  alt: string;
  publicId?: string | null;
  role?: ImageRole;
  sortOrder?: number;
  primary?: boolean;
};

export type CategoryDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionDoc = CategoryDoc;

export type ProductDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  summary: string;
  description: string;
  price: number;
  currency: typeof CURRENCY;
  designType: string | null;
  material: string | null;
  colors: string[];
  techniques: string[];
  verifiedOrigin: string | null;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  categoryIds: ObjectId[];
  collectionIds: ObjectId[];
  featured: boolean;
  featuredRank: number;
  sku?: string | null;
  published: boolean;
  publishedAt: Date | null;
  archived?: boolean;
  images: ProductImage[];
  createdAt: Date;
  updatedAt: Date;
};

export type PublicProductCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  price: number;
  currency: typeof CURRENCY;
  designType: string | null;
  material: string | null;
  colors: string[];
  techniques: string[];
  stockStatus: StockStatus;
  image: ProductImage | null;
};

export type PublicTaxon = {
  id: string;
  slug: string;
  name: string;
  description: string;
  href: string;
  productCount: number;
};
