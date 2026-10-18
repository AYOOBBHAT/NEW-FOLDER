import { addCartItem, quoteCart, setCartItem } from "@/lib/cart";
import { addCartItemSchema, setCartItemSchema } from "@/lib/checkout-input";
import { json, readJson, withShop } from "@/lib/api";
import { cartCookie, guestTokenFromCookieHeader, newGuestToken } from "@/lib/guest";
import { parseInput } from "@/lib/validators";

export async function GET(request: Request) {
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    return json(await quoteCart(db, token));
  });
}

export async function POST(request: Request) {
  return withShop(request, async (db) => {
    const input = parseInput(addCartItemSchema, await readJson(request));
    const token = guestTokenFromCookieHeader(request.headers.get("cookie")) ?? newGuestToken();
    const quote = await addCartItem(db, token, input.productId, input.quantity);
    return json(quote, 200, cartCookie(token));
  });
}

export async function PATCH(request: Request) {
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    if (!token) return json({ error: "Your bag is empty" }, 400);
    const input = parseInput(setCartItemSchema, await readJson(request));
    return json(await setCartItem(db, token, input.productId, input.quantity));
  });
}
