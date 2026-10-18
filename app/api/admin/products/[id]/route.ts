import { deleteProduct, updateProduct } from "@/lib/catalog-admin";
import { json, readJson, withAdmin } from "@/lib/api";
import { parseInput, productInputSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    const input = parseInput(productInputSchema, await readJson(request));
    const updated = await updateProduct(db, id, input);
    return json(updated);
  });
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    const removed = await deleteProduct(db, id);
    return json({ ok: true, warning: removed.warning });
  });
}
