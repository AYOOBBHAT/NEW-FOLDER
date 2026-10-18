import { createHmac, timingSafeEqual } from "node:crypto";

const proof = Symbol("verified-razorpay-payment");

export type VerifiedPayment = {
  [proof]: true;
  paymentId: string;
  razorpayOrderId: string;
  amountPaise: number;
  eventId: string;
};

export type RazorpayStatus =
  | { enabled: false; reason: "missing" | "incomplete" | "live_disabled" }
  | { enabled: true; keyId: string; keySecret: string; webhookSecret: string };

export function razorpayStatus(): RazorpayStatus {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  if (!keyId && !keySecret && !webhookSecret) return { enabled: false, reason: "missing" };
  if (!keyId || !keySecret || !webhookSecret) return { enabled: false, reason: "incomplete" };
  if (!keyId.startsWith("rzp_test_")) return { enabled: false, reason: "live_disabled" };
  return { enabled: true, keyId, keySecret, webhookSecret };
}

export function isVerifiedPayment(value: unknown): value is VerifiedPayment {
  return typeof value === "object" && value !== null && proof in value && (value as { [proof]?: boolean })[proof] === true;
}

export function verifyPaymentSignature(args: {
  razorpayOrderId: string;
  paymentId: string;
  signature: string;
  secret: string;
  amountPaise: number;
  eventId: string;
}): VerifiedPayment | null {
  if (!args.secret || !/^[a-zA-Z0-9_-]{6,40}$/.test(args.paymentId)) return null;
  if (!/^order_[a-zA-Z0-9]+$/.test(args.razorpayOrderId)) return null;
  const expected = createHmac("sha256", args.secret).update(`${args.razorpayOrderId}|${args.paymentId}`).digest("hex");
  if (!safeEqual(expected, args.signature)) return null;
  return {
    [proof]: true,
    paymentId: args.paymentId,
    razorpayOrderId: args.razorpayOrderId,
    amountPaise: args.amountPaise,
    eventId: args.eventId,
  };
}

export function proofFromCapturedPayment(
  entity: { id: string; order_id: string; amount: number; currency: string; status: string },
  eventId: string,
): VerifiedPayment | null {
  if (entity.status !== "captured" || entity.currency !== "INR") return null;
  if (!/^pay_[a-zA-Z0-9]+$/.test(entity.id) || !/^order_[a-zA-Z0-9]+$/.test(entity.order_id)) return null;
  if (!Number.isInteger(entity.amount) || entity.amount < 100) return null;
  return { [proof]: true, paymentId: entity.id, razorpayOrderId: entity.order_id, amountPaise: entity.amount, eventId };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function createRazorpayOrder(args: { amountPaise: number; receipt: string; status: RazorpayStatus }) {
  if (!args.status.enabled) throw new Error("Payments are not enabled");
  const auth = Buffer.from(`${args.status.keyId}:${args.status.keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
    body: JSON.stringify({ amount: args.amountPaise, currency: "INR", receipt: args.receipt.slice(0, 40) }),
  });
  if (!response.ok) throw new Error("Payment order was not created");
  const body = (await response.json()) as { id?: string; amount?: number; currency?: string };
  if (!body.id || body.amount !== args.amountPaise || body.currency !== "INR") {
    throw new Error("Payment order was not created");
  }
  return { id: body.id, amount: body.amount, currency: body.currency };
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
