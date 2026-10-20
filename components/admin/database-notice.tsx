import { headers } from "next/headers";
import { logDatabaseFailure, safeRequestId } from "@/lib/mongodb";

export async function adminDatabaseNotice(error: unknown) {
  const requestHeaders = await headers();
  logDatabaseFailure(error, safeRequestId(requestHeaders.get("x-vercel-id")));
  return <p>The catalogue database is unavailable.</p>;
}
