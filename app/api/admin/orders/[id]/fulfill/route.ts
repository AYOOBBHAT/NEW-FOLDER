import { fulfillOrder } from "@/lib/checkout";
import { json, withAdmin } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    const order = await fulfillOrder(db, id);
    return json({ id: order._id.toHexString(), status: order.status });
  });
}
