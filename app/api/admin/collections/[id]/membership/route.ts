import { setMembership } from "@/lib/catalog-admin";
import { json, readJson, withAdmin } from "@/lib/api";
import { membershipInputSchema, parseInput } from "@/lib/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAdmin(request, async (db) => {
    const input = parseInput(membershipInputSchema, await readJson(request));
    await setMembership(db, "collection", id, input.productId, input.assigned);
    return json({ ok: true });
  });
}
