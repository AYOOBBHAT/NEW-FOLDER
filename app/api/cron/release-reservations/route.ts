/**
 * Production must set the server-only variable CRON_SECRET to a random value of at least 16 characters.
 * Vercel Cron sends it as Authorization: Bearer <CRON_SECRET>. This route rejects any other request.
 * Never log the header or the secret, and do not prefix the variable with NEXT_PUBLIC_.
 */
import { json } from "@/lib/api";
import { releaseExpiredReservations } from "@/lib/checkout";
import { cronRequestAuthorized } from "@/lib/cron-auth";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronRequestAuthorized(request.headers.get("authorization"))) {
    return json({ error: "Unauthorized" }, 401);
  }
  try {
    const result = await releaseExpiredReservations(await getDb());
    return json(result);
  } catch {
    return json({ error: "Reservation release failed" }, 500);
  }
}
