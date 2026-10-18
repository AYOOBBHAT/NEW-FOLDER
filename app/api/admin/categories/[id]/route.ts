import { deleteTaxon, updateTaxon } from "@/lib/catalog-admin";
import { json, readJson, withAdmin } from "@/lib/api";
import { parseInput, taxonomyInputSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    const input = parseInput(taxonomyInputSchema, await readJson(request));
    await updateTaxon(db, "category", id, input);
    return json({ ok: true });
  });
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    await deleteTaxon(db, "category", id);
    return json({ ok: true });
  });
}
