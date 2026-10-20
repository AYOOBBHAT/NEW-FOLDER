import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-status";
import { DESIGN_TYPE_VALUES, MATERIAL_VALUES, STOCK_STATUS_VALUES, TECHNIQUE_VALUES } from "@/lib/vocab";

const IMAGE_ROLES = ["product", "model", "detail"] as const;

/**
 * Catalogue documents already live in MongoDB. These schemas validate the same
 * collections. Indexes are created in lib/indexes.ts with autoIndex disabled,
 * so Mongoose does not open a second index build on every connection.
 * Customer accounts are not implemented. Guest orders keep their own snapshots.
 */
mongoose.set("strictQuery", true);
mongoose.set("autoIndex", false);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true, maxlength: 180 },
    publicId: { type: String, default: null },
    role: { type: String, enum: IMAGE_ROLES, default: "product" },
    sortOrder: { type: Number, min: 0, max: 100, default: 0 },
    primary: { type: Boolean, default: false },
  },
  { _id: false },
);

const taxonSchema = new Schema(
  {
    slug: { type: String, required: true, maxlength: 80 },
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 500 },
    sortOrder: { type: Number, required: true, min: 0, max: 9999 },
    published: { type: Boolean, required: true },
  },
  { timestamps: true, strict: true },
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, maxlength: 80 },
    sku: { type: String, default: null },
    name: { type: String, required: true, maxlength: 140 },
    summary: { type: String, default: "", maxlength: 280 },
    description: { type: String, default: "", maxlength: 5000 },
    price: { type: Number, required: true, min: 0, max: 10_000_000 },
    currency: { type: String, enum: ["INR"], required: true },
    designType: { type: String, enum: [...DESIGN_TYPE_VALUES, null], default: null },
    material: { type: String, enum: [...MATERIAL_VALUES, null], default: null },
    colors: { type: [String], default: [] },
    techniques: { type: [String], default: [] },
    verifiedOrigin: { type: String, default: null },
    stockStatus: { type: String, enum: STOCK_STATUS_VALUES, required: true },
    stockQuantity: { type: Number, default: null },
    appliedRestores: { type: [String], default: [] },
    categoryIds: { type: [Schema.Types.ObjectId], default: [] },
    collectionIds: { type: [Schema.Types.ObjectId], default: [] },
    featured: { type: Boolean, default: false },
    featuredRank: { type: Number, default: 100, min: 0 },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    archived: { type: Boolean, default: false },
    images: { type: [imageSchema], default: [] },
  },
  { collection: "products", timestamps: true, strict: true },
);

export type ProductRecord = InferSchemaType<typeof productSchema>;

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 140 },
    sku: { type: String, default: null },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 5 },
    lineTotal: { type: Number, required: true, min: 0 },
    reserved: { type: Boolean, required: true },
    restored: { type: Boolean, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    number: { type: String, required: true },
    guestTokenHash: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    buyerName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    shippingAddress: {
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      region: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    items: { type: [orderItemSchema], required: true },
    currency: { type: String, enum: ["INR"], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true },
    stockReserved: { type: Boolean, required: true },
    stockReleaseDue: { type: Boolean, required: true },
    releaseLeaseUntil: { type: Date, default: null },
    reservationExpiresAt: { type: Date, default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    reconciliation: {
      type: new Schema(
        {
          reason: { type: String, enum: ["stock_released", "amount_mismatch", "conflicting_payment"], required: true },
          paymentId: { type: String, required: true },
          amountPaise: { type: Number, required: true, min: 0 },
          recordedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { collection: "orders", timestamps: true, strict: true },
);

const cartSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    items: {
      type: [
        new Schema(
          {
            productId: { type: Schema.Types.ObjectId, required: true },
            quantity: { type: Number, required: true, min: 1, max: 5 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    expiresAt: { type: Date, required: true },
  },
  { collection: "carts", timestamps: true, strict: true },
);

export const CategoryModel = mongoose.models.Category || mongoose.model("Category", taxonSchema, "categories");
export const OrderModel = mongoose.models.Order || mongoose.model("Order", orderSchema, "orders");
export const CartModel = mongoose.models.Cart || mongoose.model("Cart", cartSchema, "carts");
export const CollectionModel = mongoose.models.Collection || mongoose.model("Collection", taxonSchema, "collections");
export const ProductModel = mongoose.models.Product || mongoose.model("Product", productSchema, "products");

export async function assertStoredProduct(doc: object) {
  try {
    await new ProductModel(doc).validate();
  } catch {
    throw new Error("Product document failed schema validation");
  }
}

export async function assertStoredOrder(doc: object) {
  try {
    await new OrderModel(doc).validate();
  } catch {
    throw new Error("Order document failed schema validation");
  }
}

export async function assertStoredTaxon(kind: "category" | "collection", doc: object) {
  const Model = kind === "category" ? CategoryModel : CollectionModel;
  try {
    await new Model(doc).validate();
  } catch {
    throw new Error("Taxonomy document failed schema validation");
  }
}
