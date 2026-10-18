import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CART_COOKIE = "shawl_cart";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function newGuestToken() {
  return randomBytes(32).toString("hex");
}

export function isGuestToken(value: string) {
  return TOKEN_PATTERN.test(value);
}

export function hashGuestToken(token: string) {
  if (!isGuestToken(token)) throw new Error("Invalid guest token");
  return createHash("sha256").update(token).digest("hex");
}

export function guestTokenFromCookieHeader(header: string | null) {
  if (!header) return null;
  const parts = header.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${CART_COOKIE}=`)) continue;
    const value = part.slice(CART_COOKIE.length + 1);
    return isGuestToken(value) ? value : null;
  }
  return null;
}

export function cartCookie(token: string) {
  return {
    name: CART_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export function tokensMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
