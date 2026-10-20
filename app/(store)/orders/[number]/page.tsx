import { cookies } from "next/headers";
import { notFound, unstable_rethrow } from "next/navigation";
import { PayOrder } from "@/components/pay-order";
import { orderForGuest } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { CART_COOKIE, isGuestToken } from "@/lib/guest";
import { getDb } from "@/lib/mongodb";
import { razorpayStatus } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

const ORDER_LABELS = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
} as const;

const PAYMENT_LABELS = {
  unpaid: "Unpaid",
  pending: "Payment started",
  paid: "Paid",
  failed: "Payment failed",
  review: "Payment needs review",
  refunded: "Refunded",
} as const;

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const jar = await cookies();
  const tokenValue = jar.get(CART_COOKIE)?.value ?? "";
  const token = isGuestToken(tokenValue) ? tokenValue : null;
  try {
    const order = await orderForGuest(await getDb(), token, number);
    if (!order) notFound();
    const payments = razorpayStatus();
    return (
      <section className="wrap section">
        <p className="eyebrow">Order {order.number}</p>
        <h1>{ORDER_LABELS[order.status]}</h1>
        <p className="detail-kicker">{PAYMENT_LABELS[order.paymentStatus]}</p>
        {order.reconciliation ? (
          <p className="help">Payment was received, but this order cannot be confirmed from the reserved stock. The shop has to review it before anything else is sent.</p>
        ) : null}
        {order.paymentStatus !== "paid" && order.paymentStatus !== "review" ? (
          <p className="help">
            {payments.enabled
              ? "Razorpay must confirm the payment before this order is marked paid."
              : "Payments are not enabled. This order stays unpaid until Razorpay test keys are configured."}
          </p>
        ) : null}
        {payments.enabled && order.status === "pending_payment" ? <PayOrder number={order.number} /> : null}
        <ul>
          {order.items.map((item) => (
            <li key={`${item.name}-${item.sku ?? ""}`}>
              {item.name} × {item.quantity} · {formatPrice(item.lineTotal)}
            </li>
          ))}
        </ul>
        <p>Shipping {formatPrice(order.shipping)}</p>
        <p>Discount {formatPrice(order.discount)}</p>
        <p>Tax {formatPrice(order.tax)}</p>
        <p className="price">Total {formatPrice(order.total)}</p>
      </section>
    );
  } catch (error) {
    unstable_rethrow(error);
    return (
      <section className="wrap section">
        <h1>This order can’t be shown just now.</h1>
      </section>
    );
  }
}
