import { createProduct, searchProductSummaries } from "@/lib/catalog-admin";
import { json, readJson, withAdmin } from "@/lib/api";
import { parseInput, productInputSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  return withAdmin(request, async (db) => json({ products: await searchProductSummaries(db, q) }));
}

export async function POST(request: Request) {
  return withAdmin(request, async (db) => {
    const input = parseInput(productInputSchema, await readJson(request));
    const created = await createProduct(db, input);
    return json(created, 201);
  });
}
