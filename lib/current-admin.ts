import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyAdminToken } from "@/lib/session";

export async function getAdminSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
