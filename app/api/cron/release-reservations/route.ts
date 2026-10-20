/**
 * Protected expiry endpoint for an external scheduler. There is no Vercel Cron.
 * Hobby only allows a daily cron, which does not meet the 30-minute unpaid stock hold, so none is registered.
 * Checkout also releases holds whose stored expiry has passed. That fallback does not guarantee release exactly 30 minutes after checkout; stock can stay reserved until the next checkout or a call to this route.
 * A caller must send Authorization: Bearer <CRON_SECRET>. CRON_SECRET is server-only, at least 16 characters, and must not use a NEXT_PUBLIC_ name.
 * Never log the header or the secret.
 */
import { json } from "@/lib/api";
import { releaseExpiredReservations } from "@/lib/checkout";
import { cronRequestAuthorized } from "@/lib/cron-auth";
import { getDb, logDatabaseFailure, safeRequestId } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronRequestAuthorized(request.headers.get("authorization"))) {
    return json({ error: "Unauthorized" }, 401);
  }
  try {
    const result = await releaseExpiredReservations(await getDb());
    return json(result);
  } catch (error) {
    logDatabaseFailure(error, safeRequestId(request.headers.get("x-vercel-id")));
    return json({ error: "Reservation release failed" }, 500);
  }
}
