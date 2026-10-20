import mongoose from "mongoose";
import type { Db } from "mongodb";
import { ensureIndexes } from "@/lib/indexes";
import { markTaxonomySeeded, seedTaxonomy } from "@/lib/seed";

const globalStore = globalThis as typeof globalThis & {
  __shawlDb?: Promise<Db>;
};

export type DatabaseFailureKind =
  | "missing_uri"
  | "invalid_uri"
  | "invalid_credentials"
  | "dns"
  | "timeout"
  | "network"
  | "database_selection"
  | "unknown";

export class DatabaseUnavailable extends Error {
  readonly kind: DatabaseFailureKind;

  constructor(kind: DatabaseFailureKind) {
    super(`Database unavailable: ${kind}`);
    this.name = "DatabaseUnavailable";
    this.kind = kind;
  }
}

export function databaseFailureKind(error: unknown): DatabaseFailureKind {
  if (error instanceof DatabaseUnavailable) return error.kind;
  const message = error instanceof Error ? error.message : "";
  if (message === "MONGODB_URI is not set") return "missing_uri";
  if (/MongoParseError|Invalid scheme|Invalid connection string/i.test(message)) return "invalid_uri";
  if (/bad auth|authentication failed|auth failed/i.test(message)) return "invalid_credentials";
  if (/ENOTFOUND|querySrv|getaddrinfo|EAI_AGAIN/i.test(message)) return "dns";
  if (/timed out|server selection timeout|timeout/i.test(message)) return "timeout";
  if (/ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ECONN/i.test(message)) return "network";
  if (/missing database|database name/i.test(message)) return "database_selection";
  return "unknown";
}

/** Logs a failure category only. The message, stack, and connection string are omitted. */
export function logDatabaseFailure(error: unknown) {
  const kind = databaseFailureKind(error);
  if (kind === "unknown" && typeof error === "object" && error !== null && "codeName" in error) {
    const codeName = (error as { codeName?: unknown }).codeName;
    if (typeof codeName === "string" && /^[A-Za-z0-9]+$/.test(codeName)) {
      console.error(`Database request failed: ${codeName}`);
      return;
    }
  }
  console.error(`Database unavailable: ${kind}`);
}

function rejectedUriKind(uri: string): DatabaseFailureKind | null {
  if (!uri) return "missing_uri";
  if (uri.includes("<") || uri.includes(">") || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) return "invalid_uri";
  return null;
}

export async function prepareDatabase(db: Db) {
  await ensureIndexes(db);
  const meta = db.collection<{ _id: string; seededAt?: Date }>("meta");
  const existing = await meta.findOne({ _id: "taxonomy" });
  if (existing?.seededAt) return;
  await seedTaxonomy(db);
  await markTaxonomySeeded(db);
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI?.trim() ?? "";
  const rejected = rejectedUriKind(uri);
  if (rejected) throw new DatabaseUnavailable(rejected);
  if (!globalStore.__shawlDb) globalStore.__shawlDb = openDatabase(uri);
  try {
    const db = await globalStore.__shawlDb;
    if (mongoose.connection.readyState === 1 && db) return db;
    globalStore.__shawlDb = openDatabase(uri);
    return await globalStore.__shawlDb;
  } catch (error) {
    globalStore.__shawlDb = undefined;
    if (error instanceof DatabaseUnavailable) throw error;
    throw new DatabaseUnavailable(databaseFailureKind(error));
  }
}

export async function pingDatabase() {
  const db = await getDb();
  await db.command({ ping: 1 });
  return { database: "ok" as const };
}

async function openDatabase(uri: string): Promise<Db> {
  try {
    await import("@/lib/models");
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 20, autoIndex: false });
    }
    const db = mongoose.connection.db;
    if (!db) throw new DatabaseUnavailable("database_selection");
    await prepareDatabase(db);
    return db;
  } catch (error) {
    await mongoose.disconnect().catch(() => undefined);
    if (error instanceof DatabaseUnavailable) throw error;
    throw new DatabaseUnavailable(databaseFailureKind(error));
  }
}
