import { createTaxon } from "@/lib/catalog-admin";
import { json, readJson, withAdmin } from "@/lib/api";
import { parseInput, taxonomyInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  return withAdmin(request, async (db) => {
    const input = parseInput(taxonomyInputSchema, await readJson(request));
    const created = await createTaxon(db, "collection", input);
    return json(created, 201);
  });
}
