import { createHash, timingSafeEqual } from "node:crypto";

const MINIMUM_SECRET_LENGTH = 16;

/** Confirms Vercel Cron's Authorization bearer without logging the header or the secret. */
export function cronRequestAuthorized(authorization: string | null) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < MINIMUM_SECRET_LENGTH || !authorization) return false;
  const actual = createHash("sha256").update(authorization).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(actual, expected);
}
