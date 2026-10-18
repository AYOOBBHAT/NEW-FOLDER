import { placeOrder, publicOrder } from "@/lib/checkout";
import { checkoutInputSchema } from "@/lib/checkout-input";
import { json, readJson, withShop } from "@/lib/api";
import { guestTokenFromCookieHeader } from "@/lib/guest";
import { parseInput } from "@/lib/validators";

export async function POST(request: Request) {
  return withShop(request, async (db) => {
    const token = guestTokenFromCookieHeader(request.headers.get("cookie"));
    if (!token) return json({ error: "Your bag is empty" }, 400);
    const input = parseInput(checkoutInputSchema, await readJson(request));
    const placed = await placeOrder(db, token, input);
    return json({ created: placed.created, order: publicOrder(placed.order) }, placed.created ? 201 : 200);
  });
}
