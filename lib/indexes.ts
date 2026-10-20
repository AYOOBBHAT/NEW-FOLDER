import type { Db } from "mongodb";

export async function ensureIndexes(db: Db) {
  await db.collection("products").createIndexes([
    { key: { slug: 1 }, unique: true, name: "products_slug" },
    {
      key: { sku: 1 },
      unique: true,
      name: "products_sku",
      partialFilterExpression: { sku: { $type: "string" } },
    },
    { key: { "images.publicId": 1 }, name: "products_image_public_id" },
    {
      key: { published: 1, featured: -1, featuredRank: 1, createdAt: -1, _id: 1 },
      name: "products_featured_sort",
    },
    { key: { published: 1, createdAt: -1, _id: 1 }, name: "products_newest_sort" },
    { key: { published: 1, price: 1, _id: 1 }, name: "products_price_asc" },
    { key: { published: 1, price: -1, _id: 1 }, name: "products_price_desc" },
    { key: { published: 1, categoryIds: 1 }, name: "products_category" },
    { key: { published: 1, collectionIds: 1 }, name: "products_collection" },
    { key: { published: 1, material: 1 }, name: "products_material" },
    { key: { published: 1, designType: 1 }, name: "products_design" },
    { key: { published: 1, colors: 1 }, name: "products_colors" },
    { key: { published: 1, techniques: 1 }, name: "products_techniques" },
    { key: { published: 1, stockStatus: 1 }, name: "products_stock" },
    { key: { updatedAt: -1, _id: 1 }, name: "products_admin_updated" },
  ]);

  await db.collection("categories").createIndexes([
    { key: { slug: 1 }, unique: true, name: "categories_slug" },
    { key: { published: 1, sortOrder: 1, name: 1 }, name: "categories_public_order" },
  ]);

  await db.collection("collections").createIndexes([
    { key: { slug: 1 }, unique: true, name: "collections_slug" },
    { key: { published: 1, sortOrder: 1, name: 1 }, name: "collections_public_order" },
  ]);

  await db.collection("carts").createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: "carts_token" },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "carts_ttl" },
  ]);

  await db.collection("orders").createIndexes([
    { key: { number: 1 }, unique: true, name: "orders_number" },
    { key: { guestTokenHash: 1, idempotencyKey: 1 }, unique: true, name: "orders_idempotency" },
    { key: { guestTokenHash: 1, createdAt: -1 }, name: "orders_guest" },
    {
      key: { razorpayOrderId: 1 },
      unique: true,
      name: "orders_razorpay",
      partialFilterExpression: { razorpayOrderId: { $type: "string" } },
    },
    { key: { status: 1, reservationExpiresAt: 1 }, name: "orders_reservation" },
  ]);

  await db.collection("paymentEvents").createIndexes([
    { key: { provider: 1, eventId: 1 }, unique: true, name: "payment_events_id" },
  ]);

  await db.collection("paymentReconciliations").createIndexes([
    { key: { provider: 1, razorpayOrderId: 1, paymentId: 1 }, unique: true, name: "payment_reconcile_capture" },
  ]);
}
