import { cookies } from "next/headers";
import { CheckoutForm } from "@/components/checkout-form";
import { quoteCart } from "@/lib/cart";
import { CART_COOKIE, isGuestToken } from "@/lib/guest";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const jar = await cookies();
  const tokenValue = jar.get(CART_COOKIE)?.value ?? "";
  const token = isGuestToken(tokenValue) ? tokenValue : null;
  try {
    const quote = await quoteCart(await getDb(), token);
    return (
      <section className="wrap section">
        <p className="eyebrow">Checkout</p>
        <h1>Delivery</h1>
        {quote.ready ? <CheckoutForm total={quote.total} /> : <p className="muted">Your bag is not ready for checkout.</p>}
      </section>
    );
  } catch {
    return (
      <section className="wrap section">
        <h1>Checkout can’t be shown just now.</h1>
      </section>
    );
  }
}
