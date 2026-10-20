import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { GET } from "@/app/api/cron/release-reservations/route";
import { addCartItem } from "@/lib/cart";
import { applyVerifiedPayment, placeOrder, releaseExpiredReservations } from "@/lib/checkout";
import type { CheckoutInput } from "@/lib/checkout-input";
import { cronRequestAuthorized } from "@/lib/cron-auth";
import { newGuestToken } from "@/lib/guest";
import { prepareDatabase } from "@/lib/mongodb";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { CURRENCY, type ProductDoc } from "@/lib/types";

describe("scheduled reservation expiry", { timeout: 180_000, concurrency: 1 }, () => {
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

  it("keeps a reservation that has not reached its stored expiry", async () => {
    const product = await insertPiece(db, "unexpired-shawl", 4000);
    const order = await holdOrder(db, product.id, 4000, "idem-unexpired");
    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { reservationExpiresAt: new Date(Date.now() + 10 * 60_000) } },
    );
    const result = await releaseExpiredReservations(db);
    assert.equal(result.released, 0);
    assert.equal((await db.collection("orders").findOne({ _id: order._id }))?.status, "pending_payment");
    assert.equal(await stockOf(db, "unexpired-shawl"), 0);
  });

  it("releases an expired hold once, including when a repeated or concurrent run follows", async () => {
    const product = await insertPiece(db, "expired-shawl", 5000);
    const order = await holdOrder(db, product.id, 5000, "idem-expired");
    await expire(db, order._id);
    const first = await releaseExpiredReservations(db);
    const second = await releaseExpiredReservations(db);
    assert.equal(first.released, 1);
    assert.equal(second.released, 0);
    assert.equal(await stockOf(db, "expired-shawl"), 1);
    const stored = await db.collection("orders").findOne({ _id: order._id });
    assert.equal(stored?.status, "cancelled");
    assert.equal(stored?.paymentStatus, "failed");
    assert.equal(stored?.items[0]?.restored, true);

    const raced = await insertPiece(db, "raced-shawl", 5100);
    const racedOrder = await holdOrder(db, raced.id, 5100, "idem-raced");
    await expire(db, racedOrder._id);
    const together = await Promise.all([releaseExpiredReservations(db), releaseExpiredReservations(db)]);
    assert.equal(together.reduce((sum, result) => sum + result.released, 0), 1);
    assert.equal(await stockOf(db, "raced-shawl"), 1);
    const storedProduct = await db.collection<ProductDoc & { appliedRestores?: string[] }>("products").findOne({ slug: "raced-shawl" });
    assert.deepEqual(storedProduct?.appliedRestores, [`${racedOrder._id.toHexString()}:0`]);
  });

  it("does not release paid, review, or refunded orders", async () => {
    const paidProduct = await insertPiece(db, "paid-hold", 6000);
    const paid = await holdOrder(db, paidProduct.id, 6000, "idem-paid-hold");
    await db.collection("orders").updateOne(
      { _id: paid._id },
      {
        $set: {
          status: "confirmed",
          paymentStatus: "paid",
          razorpayOrderId: "order_PaidHold1",
          razorpayPaymentId: "pay_PaidHold1",
          reservationExpiresAt: new Date(Date.now() - 1000),
          stockReserved: false,
        },
      },
    );
    const reviewProduct = await insertPiece(db, "review-hold", 6100);
    const review = await holdOrder(db, reviewProduct.id, 6100, "idem-review-hold");
    await db.collection("orders").updateOne(
      { _id: review._id },
      {
        $set: {
          paymentStatus: "review",
          reservationExpiresAt: new Date(Date.now() - 1000),
          reconciliation: { reason: "stock_released", paymentId: "pay_ReviewHold1", amountPaise: 610_000, recordedAt: new Date() },
        },
      },
    );
    const refundedProduct = await insertPiece(db, "refunded-hold", 6200);
    const refunded = await holdOrder(db, refundedProduct.id, 6200, "idem-refunded-hold");
    await db.collection("orders").updateOne(
      { _id: refunded._id },
      { $set: { status: "cancelled", paymentStatus: "refunded", reservationExpiresAt: new Date(Date.now() - 1000), stockReserved: false } },
    );
    await db.collection("products").updateOne({ slug: "refunded-hold" }, { $set: { stockQuantity: 1, stockStatus: "in_stock" } });

    const result = await releaseExpiredReservations(db);
    assert.equal(result.released, 0);
    assert.equal(await stockOf(db, "paid-hold"), 0);
    assert.equal(await stockOf(db, "review-hold"), 0);
    assert.equal(await stockOf(db, "refunded-hold"), 1);
    assert.equal((await db.collection("orders").findOne({ _id: paid._id }))?.paymentStatus, "paid");
    assert.equal((await db.collection("orders").findOne({ _id: review._id }))?.status, "pending_payment");
    assert.equal((await db.collection("orders").findOne({ _id: review._id }))?.paymentStatus, "review");
    assert.equal((await db.collection("orders").findOne({ _id: refunded._id }))?.paymentStatus, "refunded");
  });

  it("continues after one order fails and restores that order once the line can be released", async () => {
    const broken = await insertPiece(db, "broken-line", 7000);
    const healthy = await insertPiece(db, "healthy-line", 7100);
    const brokenOrder = await holdOrder(db, broken.id, 7000, "idem-broken-line");
    const healthyOrder = await holdOrder(db, healthy.id, 7100, "idem-healthy-line");
    await expire(db, brokenOrder._id);
    await expire(db, healthyOrder._id);
    await db.collection("orders").updateOne({ _id: brokenOrder._id }, { $set: { "items.0.quantity": "bad" } });

    const failedRun = await releaseExpiredReservations(db);
    assert.ok(failedRun.failed >= 1);
    assert.equal(await stockOf(db, "broken-line"), 0);
    assert.equal(await stockOf(db, "healthy-line"), 1);
    assert.equal((await db.collection("orders").findOne({ _id: healthyOrder._id }))?.status, "cancelled");
    assert.equal((await db.collection("orders").findOne({ _id: brokenOrder._id }))?.status, "pending_payment");

    await db.collection("orders").updateOne({ _id: brokenOrder._id }, { $set: { "items.0.quantity": 1 } });
    const recovered = await releaseExpiredReservations(db);
    assert.equal(recovered.released, 1);
    assert.equal(await stockOf(db, "broken-line"), 1);
    assert.equal(await stockOf(db, "healthy-line"), 1);
    const restored = await db.collection("orders").findOne({ _id: brokenOrder._id });
    assert.equal(restored?.status, "cancelled");
    assert.equal(restored?.items[0]?.restored, true);
  });

  it("keeps a late verified capture for review after the scheduled release", async () => {
    const previous = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
    try {
      const product = await insertPiece(db, "late-after-cron", 8000);
      const order = await holdOrder(db, product.id, 8000, "idem-late-after-cron");
      await db.collection("orders").updateOne(
        { _id: order._id },
        { $set: { reservationExpiresAt: new Date(Date.now() - 1000), razorpayOrderId: "order_LateCron1", paymentStatus: "pending" } },
      );
      await releaseExpiredReservations(db);
      assert.equal(await stockOf(db, "late-after-cron"), 1);
      const signature = createHmac("sha256", "unit-test-secret").update("order_LateCron1|pay_LateCron1").digest("hex");
      const proof = verifyPaymentSignature({
        razorpayOrderId: "order_LateCron1",
        paymentId: "pay_LateCron1",
        signature,
        secret: "unit-test-secret",
        amountPaise: 800_000,
        eventId: "evt_late_cron",
      });
      assert.ok(proof);
      const reviewed = await applyVerifiedPayment(db, null, proof);
      const again = await applyVerifiedPayment(db, null, proof);
      assert.equal(reviewed?.status, "cancelled");
      assert.equal(reviewed?.paymentStatus, "review");
      assert.notEqual(reviewed?.paymentStatus, "paid");
      assert.equal(reviewed?.reconciliation?.reason, "stock_released");
      assert.equal(again?.paymentStatus, "review");
      assert.equal(await stockOf(db, "late-after-cron"), 1);
    } finally {
      if (previous === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = previous;
    }
  });

  it("lets checkout expiry and the scheduled job restore the same hold once", async () => {
    const expiredProduct = await insertPiece(db, "fallback-expired", 9000);
    const nextProduct = await insertPiece(db, "fallback-next", 9100);
    const expired = await holdOrder(db, expiredProduct.id, 9000, "idem-fallback-expired");
    await expire(db, expired._id);
    const token = newGuestToken();
    await addCartItem(db, token, nextProduct.id, 1);
    await placeOrder(db, token, checkout(9100, "idem-fallback-next"));
    assert.equal(await stockOf(db, "fallback-expired"), 1);
    await releaseExpiredReservations(db);
    assert.equal(await stockOf(db, "fallback-expired"), 1);
    assert.equal(await stockOf(db, "fallback-next"), 0);
  });
});

describe("reservation cron endpoint", () => {
  it("schedules the release path every 5 minutes", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
      crons: { path: string; schedule: string }[];
    };
    assert.deepEqual(config.crons, [{ path: "/api/cron/release-reservations", schedule: "*/5 * * * *" }]);
  });

  it("rejects a request that does not present the server secret", async () => {
    const previous = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      assert.equal(cronRequestAuthorized("Bearer something-long-enough"), false);
      process.env.CRON_SECRET = "short";
      assert.equal(cronRequestAuthorized("Bearer short"), false);
      process.env.CRON_SECRET = "cron-secret-value";
      assert.equal(cronRequestAuthorized(null), false);
      assert.equal(cronRequestAuthorized("Bearer wrong-secret-value"), false);
      assert.equal(cronRequestAuthorized("Bearer cron-secret-value"), true);
      const missing = await GET(new Request("http://localhost/api/cron/release-reservations"));
      const wrong = await GET(new Request("http://localhost/api/cron/release-reservations", { headers: { authorization: "Bearer wrong-secret-value" } }));
      assert.equal(missing.status, 401);
      assert.equal(wrong.status, 401);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});

function checkout(expectedTotal: number, idempotencyKey: string): CheckoutInput {
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

async function insertPiece(db: Db, slug: string, price: number) {
  const now = new Date();
  const doc: ProductDoc = {
    _id: new ObjectId(),
    slug,
    name: slug,
    summary: "",
    description: "",
    price,
    currency: CURRENCY,
    designType: null,
    material: null,
    colors: [],
    techniques: [],
    verifiedOrigin: null,
    stockStatus: "in_stock",
    stockQuantity: 1,
    categoryIds: [],
    collectionIds: [],
    featured: false,
    featuredRank: 1,
    published: true,
    publishedAt: now,
    archived: false,
    sku: slug.toUpperCase(),
    images: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<ProductDoc>("products").insertOne(doc);
  return { id: doc._id.toHexString() };
}

async function holdOrder(db: Db, productId: string, total: number, idempotencyKey: string) {
  const token = newGuestToken();
  await addCartItem(db, token, productId, 1);
  const placed = await placeOrder(db, token, checkout(total, idempotencyKey));
  return placed.order;
}

async function expire(db: Db, orderId: ObjectId) {
  await db.collection("orders").updateOne({ _id: orderId }, { $set: { reservationExpiresAt: new Date(Date.now() - 1000) } });
}

async function stockOf(db: Db, slug: string) {
  return (await db.collection<ProductDoc>("products").findOne({ slug }))?.stockQuantity;
}
