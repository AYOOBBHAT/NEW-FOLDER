import { adjustStock } from "@/lib/catalog-admin";
import { json, readJson, withAdmin } from "@/lib/api";
import { parseInput, stockAdjustmentSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    const input = parseInput(stockAdjustmentSchema, await readJson(request));
    return json(await adjustStock(db, id, input.delta));
  });
}
