import mongoose from "mongoose";
import type { Db } from "mongodb";
import { ensureIndexes } from "@/lib/indexes";
import { markTaxonomySeeded, seedTaxonomy } from "@/lib/seed";

const globalStore = globalThis as typeof globalThis & {
  __shawlDb?: Promise<Db>;
};

export async function prepareDatabase(db: Db) {
  await ensureIndexes(db);
  const meta = db.collection<{ _id: string; seededAt?: Date }>("meta");
  const existing = await meta.findOne({ _id: "taxonomy" });
  if (existing?.seededAt) return;
  await seedTaxonomy(db);
  await markTaxonomySeeded(db);
}

export async function getDb(): Promise<Db> {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!globalStore.__shawlDb) globalStore.__shawlDb = openDatabase();
  try {
    return await globalStore.__shawlDb;
  } catch (error) {
    globalStore.__shawlDb = undefined;
    throw error;
  }
}

export async function pingDatabase() {
  const db = await getDb();
  await db.command({ ping: 1 });
  return { database: "ok" as const };
}

async function openDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  try {
    await import("@/lib/models");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 20, autoIndex: false });
    const db = mongoose.connection.db;
    if (!db) throw new Error("missing database");
    await prepareDatabase(db);
    return db;
  } catch {
    await mongoose.disconnect().catch(() => undefined);
    throw new Error("Database connection failed");
  }
}
