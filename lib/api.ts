import { NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getAdminSession } from "@/lib/current-admin";
import { InputError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/origin";
import { getDb, logDatabaseFailure } from "@/lib/mongodb";

export function json(data: unknown, status = 200, cookie?: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }) {
  const response = NextResponse.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
  if (cookie) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export async function readJson(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new InputError("Expected JSON");
  }
  try {
    return await request.json();
  } catch {
    throw new InputError("Invalid JSON");
  }
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export async function withShop(request: Request, handler: (db: Db) => Promise<NextResponse>) {
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
    return json({ error: "Invalid origin" }, 403);
  }
  try {
    return await handler(await getDb());
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    logDatabaseFailure(error);
    return json({ error: "Something went wrong" }, 500);
  }
}

export async function withAdmin(request: Request, handler: (db: Db) => Promise<NextResponse>) {
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
    return json({ error: "Invalid origin" }, 403);
  }
  const session = await getAdminSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  try {
    const db = await getDb();
    return await handler(db);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    if (isDuplicateKey(error)) return json({ error: "That address or SKU is already in use" }, 409);
    logDatabaseFailure(error);
    return json({ error: "Something went wrong" }, 500);
  }
}
