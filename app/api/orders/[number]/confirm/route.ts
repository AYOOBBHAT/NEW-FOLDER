import { applyVerifiedPayment, orderForGuest, publicOrder } from "@/lib/checkout";
import { paymentConfirmSchema } from "@/lib/checkout-input";
import { json, readJson, withShop } from "@/lib/api";
import { guestTokenFromCookieHeader, hashGuestToken } from "@/lib/guest";
import { amountPaise } from "@/lib/money";
import { razorpayStatus, verifyPaymentSignature } from "@/lib/razorpay";
import { parseInput } from "@/lib/validators";

type Context = { params: Promise<{ number: string }> };

export async function POST(request: Request, context: Context) {
  const { number } = await context.params;
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    if (!token) return json({ error: "Order not found" }, 404);
    const status = razorpayStatus();
    if (!status.enabled) return json({ error: "Payments are not enabled" }, 400);
    const input = parseInput(paymentConfirmSchema, await readJson(request));
    const order = await orderForGuest(db, token, number);
    if (!order || order.razorpayOrderId !== input.razorpayOrderId) return json({ error: "Payment was not verified" }, 400);
    const proof = verifyPaymentSignature({
      razorpayOrderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      secret: status.keySecret,
      amountPaise: amountPaise(order.total),
      eventId: `confirm:${input.razorpayPaymentId}`,
    });
    if (!proof) return json({ error: "Payment was not verified" }, 400);
    const paid = await applyVerifiedPayment(db, hashGuestToken(token), proof);
    return json({ order: publicOrder(paid) });
  });
}
