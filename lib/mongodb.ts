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

export type DatabaseFailurePhase = "connection" | "server_selection" | "authentication" | "database_selection" | "query" | "unknown";

export type DatabaseFailureDetail = {
  kind: DatabaseFailureKind;
  phase: DatabaseFailurePhase;
  errorName: string;
  causeName?: string;
  codeName?: string;
  mongoCode?: number;
  networkCode?: string;
};

const NETWORK_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "EHOSTUNREACH", "EPIPE", "ECONNABORTED"]);
const DNS_CODES = new Set(["ENOTFOUND", "EAI_AGAIN"]);
const TIMEOUT_CODES = new Set(["ETIMEDOUT", "ESOCKETTIMEDOUT"]);

export class DatabaseUnavailable extends Error {
  readonly kind: DatabaseFailureKind;
  readonly detail: DatabaseFailureDetail;

  constructor(detail: DatabaseFailureKind | DatabaseFailureDetail) {
    const resolved = typeof detail === "string" ? detailForKind(detail) : detail;
    super(`Database unavailable: ${resolved.kind}`);
    this.name = "DatabaseUnavailable";
    this.kind = resolved.kind;
    this.detail = resolved;
  }
}

export function databaseFailureKind(error: unknown): DatabaseFailureKind {
  return describeDatabaseFailure(error).kind;
}

export function describeDatabaseFailure(error: unknown): DatabaseFailureDetail {
  if (error instanceof DatabaseUnavailable) return error.detail;
  const nodes = relatedErrors(error);
  let kind: DatabaseFailureKind = "unknown";
  let evidence: unknown = error;
  for (const node of nodes) {
    const candidate = kindFromNode(node);
    if (rank(candidate) > rank(kind) || (candidate === kind && candidate !== "unknown" && hasCode(node) && !hasCode(evidence))) {
      kind = candidate;
      evidence = node;
    }
  }
  const codeName = readCodeName(evidence) || firstSafeCodeName(nodes);
  const mongoCode = readMongoCode(evidence) ?? firstMongoCode(nodes);
  const networkCode = readNetworkCode(evidence) || firstNetworkCode(nodes);
  return {
    kind,
    phase: phaseFor(nodes, kind),
    errorName: safeErrorName(error),
    causeName: causeName(error, evidence),
    codeName,
    mongoCode,
    networkCode,
  };
}

/** Logs safe fields only. Messages, stacks, and connection strings are omitted. */
export function logDatabaseFailure(error: unknown, requestId?: string) {
  const detail = describeDatabaseFailure(error);
  const fields = [`kind=${detail.kind}`, `phase=${detail.phase}`, `name=${detail.errorName}`];
  if (detail.causeName) fields.push(`cause=${detail.causeName}`);
  if (detail.codeName) fields.push(`codeName=${detail.codeName}`);
  if (detail.mongoCode !== undefined) fields.push(`mongoCode=${detail.mongoCode}`);
  if (detail.networkCode) fields.push(`networkCode=${detail.networkCode}`);
  const request = safeRequestId(requestId);
  if (request) fields.push(`request=${request}`);
  console.error(`Database unavailable: ${fields.join(" ")}`);
}

export function safeRequestId(value: string | null | undefined) {
  if (!value || !/^[A-Za-z0-9:_-]{1,120}$/.test(value)) return undefined;
  return value;
}

function detailForKind(kind: DatabaseFailureKind): DatabaseFailureDetail {
  const phase: DatabaseFailurePhase =
    kind === "invalid_credentials"
      ? "authentication"
      : kind === "database_selection"
        ? "database_selection"
        : kind === "missing_uri" || kind === "invalid_uri"
          ? "connection"
          : kind === "unknown"
            ? "unknown"
            : "server_selection";
  return { kind, phase, errorName: "DatabaseUnavailable" };
}

function relatedErrors(error: unknown) {
  const nodes: unknown[] = [];
  const seen = new Set<unknown>();
  const visit = (value: unknown, depth: number) => {
    if (depth > 6 || value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    nodes.push(value);
    const record = value as Record<string, unknown>;
    visit(record.cause, depth + 1);
    if (record.reason !== record.cause) visit(record.reason, depth + 1);
    const servers = record.servers;
    if (servers instanceof Map) {
      for (const server of servers.values()) visit(serverError(server), depth + 1);
    }
  };
  visit(error, 0);
  return nodes;
}

function serverError(server: unknown) {
  if (server === null || typeof server !== "object" || !("error" in server)) return undefined;
  return (server as { error?: unknown }).error;
}

function kindFromNode(node: unknown): DatabaseFailureKind {
  const name = readName(node);
  const codeName = readCodeName(node);
  const mongoCode = readMongoCode(node);
  const networkCode = readNetworkCode(node);
  const message = shortDriverMessage(node);
  if (name === "MongoParseError" || message === "MONGODB_URI is not set") {
    return message === "MONGODB_URI is not set" ? "missing_uri" : "invalid_uri";
  }
  if (/^Invalid scheme\b|^Invalid connection string\b/.test(message)) return "invalid_uri";
  if (name === "MongoMissingCredentialsError" || codeName === "AuthenticationFailed" || mongoCode === 18) return "invalid_credentials";
  if (/^bad auth\b|^authentication failed\b/i.test(message)) return "invalid_credentials";
  if (name === "MongoNetworkTimeoutError" || TIMEOUT_CODES.has(networkCode ?? "") || /^Server selection timed out\b/.test(message)) return "timeout";
  if ((name === "MongoNetworkError" || name === "MongoServerSelectionError" || name === "MongooseServerSelectionError") && /\btimed out\b/i.test(message)) return "timeout";
  if (DNS_CODES.has(networkCode ?? "") || /\b(ENOTFOUND|EAI_AGAIN)\b/.test(message)) return "dns";
  if (name === "MongoNetworkError" || NETWORK_CODES.has(networkCode ?? "")) return "network";
  if (message === "missing database") return "database_selection";
  return "unknown";
}

function phaseFor(nodes: unknown[], kind: DatabaseFailureKind): DatabaseFailurePhase {
  const names = nodes.map(readName);
  if (kind === "invalid_credentials" || names.includes("MongoMissingCredentialsError")) return "authentication";
  if (names.includes("MongooseServerSelectionError") || names.includes("MongoServerSelectionError")) return "server_selection";
  if (kind === "database_selection") return "database_selection";
  if (kind === "missing_uri" || kind === "invalid_uri") return "connection";
  if (names.includes("MongoServerError")) return "query";
  if (names.includes("MongoNetworkError") || names.includes("MongoNetworkTimeoutError")) return "connection";
  return "unknown";
}

function hasCode(node: unknown) {
  return Boolean(readCodeName(node) || readMongoCode(node) !== undefined || readNetworkCode(node));
}

function rank(kind: DatabaseFailureKind) {
  return ["unknown", "database_selection", "missing_uri", "invalid_uri", "network", "timeout", "dns", "invalid_credentials"].indexOf(kind);
}

function firstSafeCodeName(nodes: unknown[]) {
  for (const node of nodes) {
    const codeName = readCodeName(node);
    if (codeName) return codeName;
  }
  return undefined;
}

function firstMongoCode(nodes: unknown[]) {
  for (const node of nodes) {
    const code = readMongoCode(node);
    if (code !== undefined) return code;
  }
  return undefined;
}

function firstNetworkCode(nodes: unknown[]) {
  for (const node of nodes) {
    const code = readNetworkCode(node);
    if (code) return code;
  }
  return undefined;
}

function causeName(root: unknown, evidence: unknown) {
  if (evidence === root) return undefined;
  const name = readName(evidence);
  if (!name || name === safeErrorName(root)) return undefined;
  return name;
}

function safeErrorName(error: unknown) {
  return readName(error) || "unknown";
}

function readName(error: unknown) {
  if (error === null || typeof error !== "object" || !("name" in error)) return "";
  const name = (error as { name?: unknown }).name;
  return typeof name === "string" && /^[A-Za-z][A-Za-z0-9]{0,80}$/.test(name) ? name : "";
}

function readCodeName(error: unknown) {
  if (error === null || typeof error !== "object" || !("codeName" in error)) return "";
  const codeName = (error as { codeName?: unknown }).codeName;
  return typeof codeName === "string" && /^[A-Za-z][A-Za-z0-9]{0,40}$/.test(codeName) ? codeName : "";
}

function readMongoCode(error: unknown) {
  if (error === null || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" && Number.isInteger(code) && code > 0 && code < 1_000_000 ? code : undefined;
}

function readNetworkCode(error: unknown) {
  if (error === null || typeof error !== "object" || !("code" in error)) return "";
  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string" || !/^[A-Z][A-Z0-9_]{1,40}$/.test(code)) return "";
  return DNS_CODES.has(code) || TIMEOUT_CODES.has(code) || NETWORK_CODES.has(code) ? code : "";
}

function shortDriverMessage(error: unknown) {
  if (!(error instanceof Error)) return "";
  const message = error.message;
  if (message.length > 180 || /https?:|whitelist|password|mongodb(?:\+srv)?:\/\//i.test(message)) return "";
  return message;
}

function unavailable(error: unknown): DatabaseUnavailable {
  return error instanceof DatabaseUnavailable ? error : new DatabaseUnavailable(describeDatabaseFailure(error));
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
    throw unavailable(error);
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
    throw unavailable(error);
  }
}
