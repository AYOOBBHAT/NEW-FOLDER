import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { addCartItem, quoteCart } from "@/lib/cart";
import { applyVerifiedPayment, orderForGuest, placeOrder, releaseExpiredReservations } from "@/lib/checkout";
import type { CheckoutInput } from "@/lib/checkout-input";
import { newGuestToken } from "@/lib/guest";
import { summarize } from "@/lib/money";
import { assertOrderTransition } from "@/lib/order-status";
import { prepareDatabase } from "@/lib/mongodb";
import { isVerifiedPayment, razorpayStatus, verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";
import { CURRENCY, type ProductDoc } from "@/lib/types";
import { InputError } from "@/lib/errors";

describe("checkout", { timeout: 180_000, concurrency: 1 }, () => {
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

  it("prices the bag from the stored product and snapshots that price", async () => {
    const product = await insertPiece(db, { slug: "priced-shawl", price: 18000, stockQuantity: 2 });
    const token = newGuestToken();
    await addCartItem(db, token, product.id, 2);
    const quote = await quoteCart(db, token);
    assert.equal(quote.total, 36000);
    assert.deepEqual(summarize([{ unitPrice: 18000, quantity: 2 }]), {
      currency: "INR",
      subtotal: 36000,
      shipping: 0,
      discount: 0,
      tax: 0,
      total: 36000,
    });
    await db.collection("products").updateOne({ _id: new ObjectId(product.id) }, { $set: { price: 20000 } });
    await assert.rejects(() => placeOrder(db, token, checkout(36000)), (error: unknown) => error instanceof InputError);
    assert.equal((await db.collection("products").findOne({ _id: new ObjectId(product.id) }))?.stockQuantity, 2);
    const placed = await placeOrder(db, token, checkout(40000));
    assert.equal(placed.order.items[0]?.unitPrice, 20000);
    assert.equal(placed.order.shipping, 0);
    assert.equal(placed.order.discount, 0);
    assert.equal(placed.order.tax, 0);
    assert.equal(placed.order.total, 40000);
    assert.equal(placed.order.paymentStatus, "unpaid");
  });

  it("reserves one piece when two checkouts compete, and repeats an idempotent checkout once", async () => {
    const product = await insertPiece(db, { slug: "last-shawl", price: 15000, stockQuantity: 1 });
    const first = newGuestToken();
    const second = newGuestToken();
    await addCartItem(db, first, product.id, 1);
    await addCartItem(db, second, product.id, 1);
    const results = await Promise.allSettled([
      placeOrder(db, first, checkout(15000, "idem-first-guest")),
      placeOrder(db, second, checkout(15000, "idem-second-guest")),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await db.collection("products").findOne({ slug: "last-shawl" }))?.stockQuantity, 0);
    const repeatProduct = await insertPiece(db, { slug: "repeat-shawl", price: 9000, stockQuantity: 2 });
    const token = newGuestToken();
    await addCartItem(db, token, repeatProduct.id, 1);
    const key = "idem-repeat-key";
    const original = await placeOrder(db, token, checkout(9000, key));
    await addCartItem(db, token, repeatProduct.id, 1);
    const repeated = await placeOrder(db, token, checkout(9000, key));
    assert.equal(repeated.created, false);
    assert.equal(repeated.order._id.toHexString(), original.order._id.toHexString());
    assert.equal((await db.collection("products").findOne({ slug: "repeat-shawl" }))?.stockQuantity, 1);
  });

  it("lets only the guest who placed the order read it", async () => {
    const product = await insertPiece(db, { slug: "private-shawl", price: 11000, stockQuantity: 1 });
    const owner = newGuestToken();
    const other = newGuestToken();
    await addCartItem(db, owner, product.id, 1);
    const placed = await placeOrder(db, owner, checkout(11000, "idem-private"));
    assert.equal((await orderForGuest(db, other, placed.order.number)), null);
    assert.equal((await orderForGuest(db, owner, placed.order.number))?.number, placed.order.number);
  });

  it("marks an order paid only after a valid signature, once", async () => {
    const previous = {
      id: process.env.RAZORPAY_KEY_ID,
      secret: process.env.RAZORPAY_KEY_SECRET,
      hook: process.env.RAZORPAY_WEBHOOK_SECRET,
    };
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook";
    try {
      assert.equal(razorpayStatus().enabled, true);
      process.env.RAZORPAY_KEY_ID = "rzp_live_unit";
      assert.equal(razorpayStatus().enabled, false);
      process.env.RAZORPAY_KEY_ID = "rzp_test_unit";

      const product = await insertPiece(db, { slug: "paid-shawl", price: 13000, stockQuantity: 1 });
      const token = newGuestToken();
      await addCartItem(db, token, product.id, 1);
      const placed = await placeOrder(db, token, checkout(13000, "idem-paid"));
      const razorpayOrderId = "order_TestPaid001";
      await db.collection("orders").updateOne(
        { _id: placed.order._id },
        { $set: { razorpayOrderId, paymentStatus: "pending" } },
      );
      const forged = verifyPaymentSignature({
        razorpayOrderId,
        paymentId: "pay_TestPaid001",
        signature: "a".repeat(64),
        secret: "unit-test-secret",
        amountPaise: 1_300_000,
        eventId: "confirm:pay_TestPaid001",
      });
      assert.equal(forged, null);
      assert.equal(isVerifiedPayment({ paymentId: "pay_TestPaid001" }), false);
      assert.equal((await db.collection("orders").findOne({ _id: placed.order._id }))?.paymentStatus, "pending");

      const signature = createHmac("sha256", "unit-test-secret").update(`${razorpayOrderId}|pay_TestPaid001`).digest("hex");
      const proof = verifyPaymentSignature({
        razorpayOrderId,
        paymentId: "pay_TestPaid001",
        signature,
        secret: "unit-test-secret",
        amountPaise: 1_300_000,
        eventId: "confirm:pay_TestPaid001",
      });
      assert.ok(proof);
      const paid = await applyVerifiedPayment(db, placed.order.guestTokenHash, proof);
      const again = await applyVerifiedPayment(db, placed.order.guestTokenHash, proof);
      assert.equal(paid.paymentStatus, "paid");
      assert.equal(paid.status, "confirmed");
      assert.equal(again.razorpayPaymentId, "pay_TestPaid001");
      assert.equal(await db.collection("paymentEvents").countDocuments({ eventId: "confirm:pay_TestPaid001" }), 1);
      const raw = JSON.stringify({ event: "payment.captured" });
      assert.equal(verifyWebhookSignature(raw, createHmac("sha256", "unit-test-webhook").update(raw).digest("hex"), "unit-test-webhook"), true);
      assert.equal(verifyWebhookSignature(raw, "nope", "unit-test-webhook"), false);
    } finally {
      restoreEnv("RAZORPAY_KEY_ID", previous.id);
      restoreEnv("RAZORPAY_KEY_SECRET", previous.secret);
      restoreEnv("RAZORPAY_WEBHOOK_SECRET", previous.hook);
    }
  });

  it("returns reserved stock after the hold expires", async () => {
    const product = await insertPiece(db, { slug: "held-shawl", price: 8000, stockQuantity: 1 });
    const token = newGuestToken();
    await addCartItem(db, token, product.id, 1);
    const placed = await placeOrder(db, token, checkout(8000, "idem-held"));
    assert.equal((await db.collection("products").findOne({ slug: "held-shawl" }))?.stockQuantity, 0);
    await db.collection("orders").updateOne({ _id: placed.order._id }, { $set: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    await releaseExpiredReservations(db);
    const order = await db.collection("orders").findOne({ _id: placed.order._id });
    assert.equal(order?.status, "cancelled");
    assert.equal(order?.paymentStatus, "failed");
    assert.notEqual(order?.paymentStatus, "paid");
    assert.equal((await db.collection("products").findOne({ slug: "held-shawl" }))?.stockQuantity, 1);
    assert.throws(() => assertOrderTransition("cancelled", "confirmed"), InputError);
  });
});

function checkout(expectedTotal: number, idempotencyKey = "idem-priced-shawl"): CheckoutInput {
  return {
    idempotencyKey,
    expectedTotal,
    buyerName: "Amina Dar",
    email: "amina@example.com",
    phone: "+91 9876543210",
    address: {
      line1: "1 River Road",
      line2: "",
      city: "Srinagar",
      region: "Jammu and Kashmir",
      postalCode: "190001",
      country: "India",
    },
  };
}

async function insertPiece(db: Db, overrides: { slug: string; price: number; stockQuantity: number | null }) {
  const now = new Date();
  const doc: ProductDoc = {
    _id: new ObjectId(),
    slug: overrides.slug,
    name: overrides.slug,
    summary: "",
    description: "",
    price: overrides.price,
    currency: CURRENCY,
    designType: null,
    material: null,
    colors: [],
    techniques: [],
    verifiedOrigin: null,
    stockStatus: "in_stock",
    stockQuantity: overrides.stockQuantity,
    categoryIds: [],
    collectionIds: [],
    featured: false,
    featuredRank: 1,
    published: true,
    publishedAt: now,
    archived: false,
    sku: overrides.slug.toUpperCase(),
    images: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<ProductDoc>("products").insertOne(doc);
  return { id: doc._id.toHexString() };
}

function restoreEnv(name: "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
