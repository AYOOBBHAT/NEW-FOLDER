import { cancelOrder, orderForGuest, publicOrder, startPayment } from "@/lib/checkout";
import { json, withShop } from "@/lib/api";
import { guestTokenFromCookieHeader } from "@/lib/guest";
import { razorpayStatus } from "@/lib/razorpay";

type Context = { params: Promise<{ number: string }> };

export async function GET(request: Request, context: Context) {
  const { number } = await context.params;
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    const order = await orderForGuest(db, token, number);
    if (!order) return json({ error: "Order not found" }, 404);
    const payments = razorpayStatus();
    return json({
      order: publicOrder(order),
      paymentsEnabled: payments.enabled,
      keyId: payments.enabled ? payments.keyId : null,
    });
  });
}

export async function DELETE(request: Request, context: Context) {
  const { number } = await context.params;
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    if (!token) return json({ error: "Order not found" }, 404);
    return json({ order: publicOrder(await cancelOrder(db, token, number)) });
  });
}

export async function POST(request: Request, context: Context) {
  const { number } = await context.params;
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    if (!token) return json({ error: "Order not found" }, 404);
    const started = await startPayment(db, token, number);
    return json({
      keyId: started.keyId,
      razorpayOrderId: started.order.razorpayOrderId,
      amount: started.order.total * 100,
      currency: started.order.currency,
      order: publicOrder(started.order),
    });
  });
}
