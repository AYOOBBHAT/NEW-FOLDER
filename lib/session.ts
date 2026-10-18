import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "shawl_admin_session";

function secretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function isAdminConfigured() {
  const email = process.env.ADMIN_EMAIL ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return email.length >= 3 && password.length >= 8 && secret.length >= 32;
}

export async function signAdminToken(email: string) {
  const key = secretKey();
  if (!key) throw new Error("Admin session secret is not configured");
  return new SignJWT({ role: "admin", email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
}

export async function verifyAdminToken(token: string) {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || payload.sub !== "admin" || typeof payload.email !== "string") return null;
    return { email: payload.email, role: "admin" as const };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}
