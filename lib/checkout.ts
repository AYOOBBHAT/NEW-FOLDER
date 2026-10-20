import { ObjectId, type Db } from "mongodb";
import { clearCart, purchaseBlock, quoteCart } from "@/lib/cart";
import { assertStoredOrder } from "@/lib/models";
import { InputError } from "@/lib/errors";
import { hashGuestToken } from "@/lib/guest";
import { amountPaise, lineTotal, RESERVATION_MINUTES, summarize } from "@/lib/money";
import {
  assertOrderTransition,
  assertPaymentTransition,
  type OrderStatus,
  type PaymentStatus,
  type ReconciliationReason,
} from "@/lib/order-status";
import { createRazorpayOrder, isVerifiedPayment, razorpayStatus, type VerifiedPayment } from "@/lib/razorpay";
import { CURRENCY, type ProductDoc } from "@/lib/types";
import type { CheckoutInput } from "@/lib/checkout-input";

export type OrderItemDoc = {
  productId: ObjectId;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  reserved: boolean;
  restored: boolean;
};

export type OrderDoc = {
  _id: ObjectId;
  number: string;
  guestTokenHash: string;
  idempotencyKey: string;
  buyerName: string;
  email: string;
  phone: string;
  shippingAddress: CheckoutInput["address"];
  items: OrderItemDoc[];
  currency: typeof CURRENCY;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stockReserved: boolean;
  stockReleaseDue: boolean;
  releaseLeaseUntil: Date | null;
  reservationExpiresAt: Date | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  reconciliation: {
    reason: ReconciliationReason;
    paymentId: string;
    amountPaise: number;
    recordedAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function placeOrder(db: Db, token: string, input: CheckoutInput) {
  await releaseExpiredReservations(db);
  const guestTokenHash = hashGuestToken(token);
  const existing = await db.collection<OrderDoc>("orders").findOne({ guestTokenHash, idempotencyKey: input.idempotencyKey });
  if (existing) return { order: existing, created: false };

  const quote = await quoteCart(db, token);
  if (!quote.ready) throw new InputError("Review your bag before checkout");
  if (input.expectedTotal !== quote.total) throw new InputError("The total has changed. Review the bag and try again.");

  const lines = await snapshotLines(db, quote.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })));
  const money = summarize(lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })));
  if (money.total !== quote.total) throw new InputError("The total has changed. Review the bag and try again.");

  const reserved: OrderItemDoc[] = [];
  try {
    for (const line of lines) {
      if (!line.reserved) continue;
      const ok = await reserveStock(db, line.productId, line.quantity);
      if (!ok) throw new InputError("Not enough pieces are available");
      reserved.push(line);
    }
    const now = new Date();
    const order: OrderDoc = {
      _id: new ObjectId(),
      number: orderNumber(now),
      guestTokenHash,
      idempotencyKey: input.idempotencyKey,
      buyerName: input.buyerName,
      email: input.email,
      phone: input.phone,
      shippingAddress: input.address,
      items: lines,
      currency: CURRENCY,
      subtotal: money.subtotal,
      shipping: money.shipping,
      discount: money.discount,
      tax: money.tax,
      total: money.total,
      status: "pending_payment",
      paymentStatus: "unpaid",
      stockReserved: reserved.length > 0,
      stockReleaseDue: false,
      releaseLeaseUntil: null,
      reservationExpiresAt: new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000),
      razorpayOrderId: null,
      razorpayPaymentId: null,
      reconciliation: null,
      createdAt: now,
      updatedAt: now,
    };
    await assertStoredOrder(order);
    await db.collection<OrderDoc>("orders").insertOne(order);
    await clearCart(db, token).catch(() => undefined);
    return { order, created: true };
  } catch (error) {
    await restoreLines(db, reserved);
    if (isDuplicateKey(error)) {
      const raced = await db.collection<OrderDoc>("orders").findOne({ guestTokenHash, idempotencyKey: input.idempotencyKey });
      if (raced) return { order: raced, created: false };
    }
    throw error;
  }
}

export async function orderForGuest(db: Db, token: string | null, number: string) {
  if (!token || !/^[A-Z0-9-]{8,40}$/.test(number)) return null;
  return db.collection<OrderDoc>("orders").findOne({ number, guestTokenHash: hashGuestToken(token) });
}

export async function cancelOrder(db: Db, token: string, number: string) {
  const order = await orderForGuest(db, token, number);
  if (!order) throw new InputError("Order not found", 404);
  if (order.status !== "pending_payment") throw new InputError("That order can no longer be cancelled");
  await releaseReservation(db, order._id, "failed");
  const updated = await db.collection<OrderDoc>("orders").findOne({ _id: order._id });
  if (!updated) throw new InputError("Order not found", 404);
  return updated;
}

export async function startPayment(db: Db, token: string, number: string) {
  const status = razorpayStatus();
  if (!status.enabled) throw new InputError("Payments are not enabled");
  const order = await orderForGuest(db, token, number);
  if (!order) throw new InputError("Order not found", 404);
  if (order.paymentStatus === "paid") return { order, keyId: status.keyId, reused: true };
  if (order.paymentStatus === "review" || order.reconciliation) throw new InputError("This payment is waiting for review");
  if (order.status !== "pending_payment") throw new InputError("This order is not awaiting payment");
  if (order.reservationExpiresAt && order.reservationExpiresAt.getTime() <= Date.now()) {
    await releaseReservation(db, order._id, "failed");
    throw new InputError("The hold on these pieces has expired");
  }
  if (order.razorpayOrderId && order.paymentStatus === "pending") {
    return { order, keyId: status.keyId, reused: true };
  }
  assertPaymentTransition(order.paymentStatus, "pending");
  const created = await createRazorpayOrder({
    amountPaise: amountPaise(order.total),
    receipt: order.number,
    status,
  });
  const updated = await db.collection<OrderDoc>("orders").findOneAndUpdate(
    { _id: order._id, paymentStatus: order.paymentStatus, razorpayOrderId: null },
    { $set: { razorpayOrderId: created.id, paymentStatus: "pending", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) {
    const current = await orderForGuest(db, token, number);
    if (current?.razorpayOrderId) return { order: current, keyId: status.keyId, reused: true };
    throw new InputError("Payment could not be started");
  }
  return { order: updated, keyId: status.keyId, reused: false };
}

export async function applyVerifiedPayment(db: Db, guestTokenHash: string | null, payment: VerifiedPayment) {
  if (!isVerifiedPayment(payment)) throw new InputError("Payment was not verified");
  await recordPaymentEvent(db, payment.eventId, payment.razorpayOrderId);
  const order = await db.collection<OrderDoc>("orders").findOne({ razorpayOrderId: payment.razorpayOrderId });
  if (!order) {
    await recordUnmatchedCapture(db, payment);
    return null;
  }
  if (guestTokenHash && order.guestTokenHash !== guestTokenHash) throw new InputError("Order not found", 404);
  if (amountPaise(order.total) !== payment.amountPaise) {
    if (order.status === "pending_payment" && !order.stockReleaseDue && order.paymentStatus !== "review") {
      await releaseReservation(db, order._id, "failed");
    }
    return flagReconciliation(db, order, payment, "amount_mismatch");
  }
  if (order.paymentStatus === "paid" || order.status === "confirmed" || order.status === "fulfilled") {
    if (order.razorpayPaymentId === payment.paymentId) return order;
    return flagReconciliation(db, order, payment, "conflicting_payment");
  }
  if (order.reconciliation?.paymentId === payment.paymentId) return reloadOrder(db, order._id);
  if (holdIntact(order)) {
    const confirmed = await confirmHeldOrder(db, order, payment);
    if (confirmed) return confirmed;
  }
  const current = await reloadOrder(db, order._id);
  if (current.paymentStatus === "paid" && current.razorpayPaymentId === payment.paymentId) return current;
  if (current.reconciliation?.paymentId === payment.paymentId) return current;
  return flagReconciliation(db, current, payment, "stock_released");
}

export async function markPaymentFailed(db: Db, razorpayOrderId: string, eventId: string) {
  await recordPaymentEvent(db, eventId, razorpayOrderId);
  const order = await db.collection<OrderDoc>("orders").findOne({ razorpayOrderId });
  if (!order || order.paymentStatus === "paid" || order.paymentStatus === "refunded" || order.paymentStatus === "review") return;
  if (order.reconciliation) return;
  if (order.status === "pending_payment") await releaseReservation(db, order._id, "failed");
}

export async function markRefunded(db: Db, razorpayPaymentId: string, eventId: string) {
  const recorded = await recordPaymentEvent(db, eventId, razorpayPaymentId);
  if (recorded === "duplicate") return;
  const order = await db.collection<OrderDoc>("orders").findOne({ razorpayPaymentId });
  if (!order) return;
  assertPaymentTransition(order.paymentStatus, "refunded");
  await db.collection<OrderDoc>("orders").updateOne(
    { _id: order._id, paymentStatus: "paid" },
    { $set: { paymentStatus: "refunded", updatedAt: new Date() } },
  );
}

export async function fulfillOrder(db: Db, id: string) {
  if (!ObjectId.isValid(id)) throw new InputError("Order not found", 404);
  const order = await db.collection<OrderDoc>("orders").findOne({ _id: new ObjectId(id) });
  if (!order) throw new InputError("Order not found", 404);
  assertOrderTransition(order.status, "fulfilled");
  const updated = await db.collection<OrderDoc>("orders").findOneAndUpdate(
    { _id: order._id, status: "confirmed" },
    { $set: { status: "fulfilled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) throw new InputError("That order status change is not allowed");
  return updated;
}

export type ReservationExpiryResult = { examined: number; released: number; failed: number };

export async function releaseExpiredReservations(db: Db): Promise<ReservationExpiryResult> {
  const result: ReservationExpiryResult = { examined: 0, released: 0, failed: 0 };
  const record = (finished: { completed: number; failed: number }) => {
    result.released += finished.completed;
    result.failed += finished.failed;
  };
  for (let batch = 0; batch < 10; batch += 1) {
    record(await finishStockReleases(db));
    const now = new Date();
    const due = await db
      .collection<OrderDoc>("orders")
      .find({
        status: "pending_payment",
        reservationExpiresAt: { $lte: now },
        paymentStatus: { $in: ["unpaid", "pending", "failed"] },
        stockReleaseDue: { $ne: true },
      })
      .limit(20)
      .toArray();
    if (!due.length) return result;
    result.examined += due.length;
    let released = 0;
    for (const order of due) {
      try {
        if (await releaseReservation(db, order._id, "failed")) {
          released += 1;
          result.released += 1;
        }
      } catch {
        result.failed += 1;
      }
    }
    if (released === 0 || due.length < 20) break;
  }
  record(await finishStockReleases(db));
  return result;
}

async function snapshotLines(db: Db, items: { productId: string; quantity: number }[]) {
  const lines: OrderItemDoc[] = [];
  for (const item of items) {
    const product = await db.collection<ProductDoc>("products").findOne({ _id: new ObjectId(item.productId) });
    if (!product) throw new InputError("That piece is not available");
    const block = purchaseBlock(product, item.quantity);
    if (block) throw new InputError(block);
    const reserved = product.stockStatus === "in_stock";
    lines.push({
      productId: product._id,
      name: product.name,
      sku: product.sku ?? null,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal: lineTotal(product.price, item.quantity),
      reserved,
      restored: false,
    });
  }
  return lines;
}

async function reserveStock(db: Db, productId: ObjectId, quantity: number) {
  const now = new Date();
  const updated = await db.collection<ProductDoc>("products").findOneAndUpdate(
    {
      _id: productId,
      published: true,
      archived: { $ne: true },
      stockStatus: "in_stock",
      stockQuantity: { $gte: quantity },
    },
    [
      {
        $set: {
          stockQuantity: { $add: ["$stockQuantity", -quantity] },
          updatedAt: now,
          stockStatus: {
            $cond: [{ $lte: [{ $add: ["$stockQuantity", -quantity] }, 0] }, "sold_out", "$stockStatus"],
          },
        },
      },
    ],
    { returnDocument: "after" },
  );
  return Boolean(updated);
}

async function releaseReservation(db: Db, orderId: ObjectId, paymentStatus: "failed") {
  const now = new Date();
  const claimed = await db.collection<OrderDoc>("orders").findOneAndUpdate(
    {
      _id: orderId,
      status: "pending_payment",
      paymentStatus: { $in: ["unpaid", "pending", "failed"] },
      stockReleaseDue: { $ne: true },
    },
    { $set: { stockReserved: false, stockReleaseDue: true, releaseLeaseUntil: new Date(now.getTime() + 60_000), updatedAt: now } },
    { returnDocument: "before" },
  );
  if (!claimed) return false;
  assertOrderTransition(claimed.status, "cancelled");
  if (claimed.paymentStatus !== "review") assertPaymentTransition(claimed.paymentStatus, paymentStatus);
  try {
    if (claimed.stockReserved) await restoreOrderStock(db, orderId);
    await finishRelease(db, orderId);
  } catch (error) {
    await db.collection<OrderDoc>("orders").updateOne(
      { _id: orderId, stockReleaseDue: true },
      { $set: { releaseLeaseUntil: null } },
    );
    throw error;
  }
  return true;
}

async function finishStockReleases(db: Db) {
  const now = new Date();
  const due = await db
    .collection<OrderDoc>("orders")
    .find({
      stockReleaseDue: true,
      paymentStatus: { $ne: "paid" },
      $or: [{ releaseLeaseUntil: null }, { releaseLeaseUntil: { $lte: now } }],
    })
    .limit(20)
    .toArray();
  let completed = 0;
  let failed = 0;
  for (const order of due) {
    try {
      const claimed = await db.collection<OrderDoc>("orders").findOneAndUpdate(
        {
          _id: order._id,
          stockReleaseDue: true,
          paymentStatus: { $ne: "paid" },
        },
        { $set: { releaseLeaseUntil: new Date(now.getTime() + 60_000) } },
        { returnDocument: "before" },
      );
      if (!claimed?.stockReleaseDue) continue;
      await restoreOrderStock(db, order._id);
      await finishRelease(db, order._id);
      completed += 1;
    } catch {
      await db.collection<OrderDoc>("orders").updateOne(
        { _id: order._id, stockReleaseDue: true },
        { $set: { releaseLeaseUntil: null } },
      );
      failed += 1;
    }
  }
  return { completed, failed };
}

async function finishRelease(db: Db, orderId: ObjectId) {
  await db.collection<OrderDoc>("orders").updateOne({ _id: orderId, stockReleaseDue: true }, [
    {
      $set: {
        status: "cancelled",
        paymentStatus: {
          $cond: [{ $in: ["$paymentStatus", ["paid", "review", "refunded"]] }, "$paymentStatus", "failed"],
        },
        stockReleaseDue: false,
        releaseLeaseUntil: null,
        reservationExpiresAt: null,
        updatedAt: new Date(),
      },
    },
  ]);
}

async function restoreOrderStock(db: Db, orderId: ObjectId) {
  const order = await db.collection<OrderDoc>("orders").findOne({ _id: orderId });
  if (!order) return;
  for (let index = 0; index < order.items.length; index += 1) {
    const line = order.items[index];
    if (!line?.reserved || line.restored) continue;
    await restoreReservedLine(db, orderId, index, line);
    await db.collection<OrderDoc>("orders").updateOne(
      { _id: orderId, [`items.${index}.reserved`]: true, [`items.${index}.restored`]: { $ne: true } },
      { $set: { [`items.${index}.restored`]: true, updatedAt: new Date() } },
    );
  }
}

async function restoreLines(db: Db, lines: OrderItemDoc[]) {
  for (const line of lines) await restoreLine(db, line);
}

async function restoreReservedLine(db: Db, orderId: ObjectId, index: number, line: OrderItemDoc) {
  if (!line.reserved || !Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new Error("Reserved stock could not be restored");
  }
  const releaseKey = `${orderId.toHexString()}:${index}`;
  const now = new Date();
  const result = await db.collection<ProductDoc>("products").updateOne({ _id: line.productId }, [
    {
      $set: {
        stockQuantity: {
          $cond: [
            { $in: [releaseKey, { $ifNull: ["$appliedRestores", []] }] },
            "$stockQuantity",
            { $add: [{ $ifNull: ["$stockQuantity", 0] }, line.quantity] },
          ],
        },
        stockStatus: {
          $cond: [
            { $in: [releaseKey, { $ifNull: ["$appliedRestores", []] }] },
            "$stockStatus",
            {
              $cond: [
                {
                  $and: [
                    { $eq: ["$stockStatus", "sold_out"] },
                    { $gt: [{ $add: [{ $ifNull: ["$stockQuantity", 0] }, line.quantity] }, 0] },
                  ],
                },
                "in_stock",
                "$stockStatus",
              ],
            },
          ],
        },
        appliedRestores: { $setUnion: [{ $ifNull: ["$appliedRestores", []] }, [releaseKey]] },
        updatedAt: now,
      },
    },
  ]);
  if (result.matchedCount !== 1) throw new Error("Reserved stock could not be restored");
}

async function restoreLine(db: Db, line: OrderItemDoc) {
  const now = new Date();
  if (!line.reserved) return;
    await db.collection<ProductDoc>("products").updateOne({ _id: line.productId }, [
      {
        $set: {
          stockQuantity: { $add: [{ $ifNull: ["$stockQuantity", 0] }, line.quantity] },
          updatedAt: now,
          stockStatus: {
            $cond: [
              {
                $and: [
                  { $eq: ["$stockStatus", "sold_out"] },
                  { $gt: [{ $add: [{ $ifNull: ["$stockQuantity", 0] }, line.quantity] }, 0] },
                ],
              },
              "in_stock",
              "$stockStatus",
            ],
          },
        },
      },
    ]);
}

async function recordPaymentEvent(db: Db, eventId: string, reference: string) {
  try {
    await db.collection("paymentEvents").insertOne({
      _id: new ObjectId(),
      provider: "razorpay",
      eventId,
      reference,
      createdAt: new Date(),
    });
    return "new" as const;
  } catch (error) {
    if (isDuplicateKey(error)) return "duplicate" as const;
    throw error;
  }
}

function holdIntact(order: OrderDoc) {
  if (order.status !== "pending_payment" || order.stockReleaseDue || order.reconciliation) return false;
  if (order.paymentStatus !== "unpaid" && order.paymentStatus !== "pending") return false;
  return !order.items.some((item) => item.reserved && item.restored);
}

async function confirmHeldOrder(db: Db, order: OrderDoc, payment: VerifiedPayment) {
  const now = new Date();
  return db.collection<OrderDoc>("orders").findOneAndUpdate(
    {
      _id: order._id,
      status: "pending_payment",
      paymentStatus: { $in: ["unpaid", "pending"] },
      stockReleaseDue: { $ne: true },
      reconciliation: null,
      items: { $not: { $elemMatch: { reserved: true, restored: true } } },
    },
    {
      $set: {
        paymentStatus: "paid",
        status: "confirmed",
        razorpayPaymentId: payment.paymentId,
        stockReserved: false,
        reservationExpiresAt: null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
}

async function flagReconciliation(db: Db, order: OrderDoc, payment: VerifiedPayment, reason: ReconciliationReason) {
  const now = new Date();
  const reconciliation = {
    reason,
    paymentId: payment.paymentId,
    amountPaise: payment.amountPaise,
    recordedAt: now,
  };
  if (reason === "conflicting_payment") {
    const updated = await db.collection<OrderDoc>("orders").findOneAndUpdate(
      { _id: order._id, reconciliation: null, razorpayPaymentId: { $ne: payment.paymentId } },
      { $set: { reconciliation, updatedAt: now } },
      { returnDocument: "after" },
    );
    return updated ?? reloadOrder(db, order._id);
  }
  const updated = await db.collection<OrderDoc>("orders").findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: { $nin: ["paid", "refunded"] },
      $or: [{ reconciliation: null }, { "reconciliation.paymentId": payment.paymentId }],
    },
    { $set: { paymentStatus: "review", reconciliation, updatedAt: now } },
    { returnDocument: "after" },
  );
  if (updated) {
    await db.collection<OrderDoc>("orders").updateOne(
      { _id: order._id, razorpayPaymentId: null },
      { $set: { razorpayPaymentId: payment.paymentId } },
    );
    return reloadOrder(db, order._id);
  }
  return reloadOrder(db, order._id);
}

async function recordUnmatchedCapture(db: Db, payment: VerifiedPayment) {
  await db.collection("paymentReconciliations").updateOne(
    { provider: "razorpay", razorpayOrderId: payment.razorpayOrderId, paymentId: payment.paymentId },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        provider: "razorpay",
        razorpayOrderId: payment.razorpayOrderId,
        paymentId: payment.paymentId,
        amountPaise: payment.amountPaise,
        reason: "unknown_order",
        eventId: payment.eventId,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

async function reloadOrder(db: Db, id: ObjectId) {
  const order = await db.collection<OrderDoc>("orders").findOne({ _id: id });
  if (!order) throw new InputError("Order not found", 404);
  return order;
}

export function publicOrder(order: OrderDoc) {
  return {
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    reconciliationReason: order.reconciliation?.reason ?? null,
    currency: order.currency,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    buyerName: order.buyerName,
    items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    reservationExpiresAt: order.reservationExpiresAt,
  };
}

function orderNumber(now: Date) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = new ObjectId().toHexString().slice(-6).toUpperCase();
  return `SH-${year}${month}${day}-${suffix}`;
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}
