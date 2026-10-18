import Link from "next/link";
import { cookies } from "next/headers";
import { CartEditor } from "@/components/cart-editor";
import { quoteCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { CART_COOKIE, isGuestToken } from "@/lib/guest";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const jar = await cookies();
  const tokenValue = jar.get(CART_COOKIE)?.value ?? "";
  const token = isGuestToken(tokenValue) ? tokenValue : null;
  try {
    const quote = await quoteCart(await getDb(), token);
    return (
      <section className="wrap section">
        <p className="eyebrow">Bag</p>
        <h1>Your bag</h1>
        <CartEditor quote={quote} />
        {quote.ready ? (
          <p>
            <Link className="button" href="/checkout">
              Checkout · {formatPrice(quote.total)}
            </Link>
          </p>
        ) : null}
      </section>
    );
  } catch {
    return (
      <section className="wrap section">
        <h1>Your bag can’t be shown just now.</h1>
      </section>
    );
  }
}
