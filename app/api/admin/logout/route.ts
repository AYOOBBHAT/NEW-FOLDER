import { json } from "@/lib/api";
import { getAdminSession } from "@/lib/current-admin";
import { isSameOrigin } from "@/lib/origin";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const session = await getAdminSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const response = json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
