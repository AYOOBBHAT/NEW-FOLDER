import { adminCredentialsMatch } from "@/lib/password";
import { json, readJson } from "@/lib/api";
import { InputError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/origin";
import { isAdminConfigured, sessionCookie, signAdminToken } from "@/lib/session";
import { loginInputSchema, parseInput } from "@/lib/validators";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  if (!isAdminConfigured()) return json({ error: "Admin sign-in is not configured." }, 503);
  try {
    const input = parseInput(loginInputSchema, await readJson(request));
    if (!adminCredentialsMatch(input.email, input.password)) {
      return json({ error: "Those sign-in details are not valid." }, 401);
    }
    const token = await signAdminToken(input.email);
    const response = json({ ok: true });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof InputError) return json({ error: "Those sign-in details are not valid." }, 401);
    console.error(error);
    return json({ error: "Something went wrong" }, 500);
  }
}
