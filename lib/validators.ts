import { z } from "zod";
import { InputError } from "@/lib/errors";
import { IMAGE_ROLES } from "@/lib/types";
import {
  COLOR_VALUES,
  DESIGN_TYPE_VALUES,
  MATERIAL_VALUES,
  STOCK_STATUS_VALUES,
  TECHNIQUE_VALUES,
} from "@/lib/vocab";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "That selection is not valid");

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.toLowerCase()))];
}

function httpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export const taxonomyInputSchema = z.strictObject({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  slug: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(80, "Address is too long")
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  sortOrder: z.number().int("Order must be a whole number").min(0).max(9999),
  published: z.boolean(),
});

const imageSchema = z
  .strictObject({
    url: z.string().trim().refine(httpsUrl, "Use an https image URL"),
    alt: z.string().trim().min(1, "Describe the photograph").max(180, "Image description is too long"),
    publicId: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .optional()
      .transform((value) => (value ? value : null)),
    role: z.enum(IMAGE_ROLES).optional().default("product"),
    sortOrder: z.number().int().min(0).max(100).optional().default(0),
    primary: z.boolean().optional().default(false),
  })
  .superRefine((image, context) => {
    if (!image.publicId) return;
    if (!/^shawl-house\/products\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(image.publicId) || image.publicId.includes("..")) {
      context.addIssue({ code: "custom", message: "That photograph reference is not valid" });
      return;
    }
    try {
      const url = new URL(image.url);
      if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
        context.addIssue({ code: "custom", message: "Hosted photographs must use the image service" });
      }
    } catch {
      context.addIssue({ code: "custom", message: "Use an https image URL" });
    }
  });

export const productInputSchema = z.strictObject({
  name: z.string().trim().min(1, "Name is required").max(140, "Name is too long"),
  slug: z
    .string()
    .trim()
    .max(80, "Address is too long")
    .refine((value) => value === "" || slugPattern.test(value), "Use lowercase letters, numbers, and hyphens"),
  summary: z.string().trim().max(280, "Summary is too long"),
  description: z.string().trim().max(5000, "Description is too long"),
  price: z
    .number()
    .int("Price must be a whole number of rupees")
    .nonnegative("Price cannot be negative")
    .max(10_000_000, "Price is too large"),
  designType: z.enum(DESIGN_TYPE_VALUES).nullable(),
  material: z.enum(MATERIAL_VALUES).nullable(),
  colors: z
    .array(z.enum(COLOR_VALUES))
    .max(8, "Choose fewer colors")
    .transform((values) => [...new Set(values)]),
  techniques: z
    .array(z.enum(TECHNIQUE_VALUES))
    .max(8, "Choose fewer techniques")
    .transform((values) => [...new Set(values)]),
  verifiedOrigin: z
    .string()
    .trim()
    .max(120, "Origin note is too long")
    .nullable()
    .transform((value) => (value ? value : null)),
  stockStatus: z.enum(STOCK_STATUS_VALUES),
  stockQuantity: z.number().int().nonnegative().max(100_000).nullable(),
  categoryIds: z.array(objectId).max(20, "Choose fewer categories").transform(uniqueIds),
  collectionIds: z.array(objectId).max(20, "Choose fewer collections").transform(uniqueIds),
  featured: z.boolean(),
  featuredRank: z.number().int().min(0).max(10_000),
  published: z.boolean(),
  archived: z.boolean().optional().default(false),
  sku: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .trim()
      .max(40, "SKU is too long")
      .transform((value) => (value ? value.toUpperCase() : null))
      .refine((value) => value === null || /^[A-Z0-9][A-Z0-9-]{0,39}$/.test(value), "SKU uses letters, numbers, and hyphens"),
  ),
  images: z
    .array(imageSchema)
    .max(8, "Use eight photographs or fewer"),
});

export const imageRemovalSchema = z.strictObject({
  publicId: z
    .string()
    .trim()
    .refine((value) => /^shawl-house\/products\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value) && !value.includes(".."), "That photograph reference is not valid"),
});

export const stockAdjustmentSchema = z.strictObject({
  delta: z.number().int("Stock change must be a whole number").min(-100_000).max(100_000).refine((value) => value !== 0, "Stock change must be a whole number"),
});

export const loginInputSchema = z.strictObject({
  email: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
});

export const membershipInputSchema = z.strictObject({
  productId: objectId,
  assigned: z.boolean(),
});

export type TaxonomyInput = z.infer<typeof taxonomyInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new InputError(result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}
