import { applyVerifiedPayment, markPaymentFailed, markRefunded } from "@/lib/checkout";
import { json } from "@/lib/api";
import { InputError } from "@/lib/errors";
import { proofFromCapturedPayment, razorpayStatus, verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const status = razorpayStatus();
  if (!status.enabled) return json({ error: "Not found" }, 404);
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature, status.webhookSecret)) return json({ error: "Invalid signature" }, 400);
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(eventId)) return json({ error: "Invalid event" }, 400);
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid event" }, 400);
  }
  const event = readEvent(payload);
  if (!event) return json({ received: true });
  const { getDb } = await import("@/lib/mongodb");
  try {
    const db = await getDb();
    if (event.name === "payment.captured" && event.payment) {
      const proof = proofFromCapturedPayment(event.payment, eventId);
      if (proof) await applyVerifiedPayment(db, null, proof);
    } else if (event.name === "payment.failed" && event.payment?.order_id) {
      await markPaymentFailed(db, event.payment.order_id, eventId);
    } else if (event.name === "refund.processed" && event.refundPaymentId) {
      await markRefunded(db, event.refundPaymentId, eventId);
    }
  } catch (error) {
    if (error instanceof InputError) return json({ received: true });
    return json({ error: "Event could not be recorded" }, 500);
  }
  return json({ received: true });
}

function readEvent(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const name = (payload as { event?: unknown }).event;
  if (typeof name !== "string") return null;
  const body = (payload as { payload?: { payment?: { entity?: unknown }; refund?: { entity?: { payment_id?: unknown } } } }).payload;
  const payment = readPayment(body?.payment?.entity);
  const refundPaymentId = typeof body?.refund?.entity?.payment_id === "string" ? body.refund.entity.payment_id : null;
  return { name, payment, refundPaymentId };
}

function readPayment(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const entity = value as { id?: unknown; order_id?: unknown; amount?: unknown; currency?: unknown; status?: unknown };
  if (typeof entity.id !== "string" || typeof entity.order_id !== "string") return null;
  if (typeof entity.amount !== "number" || typeof entity.currency !== "string" || typeof entity.status !== "string") return null;
  return { id: entity.id, order_id: entity.order_id, amount: entity.amount, currency: entity.currency, status: entity.status };
}
