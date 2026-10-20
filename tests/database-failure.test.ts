import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DatabaseUnavailable, databaseFailureKind, describeDatabaseFailure, getDb, logDatabaseFailure } from "@/lib/mongodb";

const atlasMessage =
  "Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted. Make sure your current IP address is on your Atlas cluster's IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/";

describe("database failure diagnostics", () => {
  it("classifies driver messages and omits connection strings from the log", () => {
    assert.equal(databaseFailureKind(named("Error", "querySrv ENOTFOUND cluster.example.net", { code: "ENOTFOUND" })), "dns");
    assert.equal(databaseFailureKind(named("Error", "bad auth : authentication failed")), "invalid_credentials");
    assert.equal(databaseFailureKind(named("MongoServerSelectionError", "Server selection timed out after 8000 ms")), "timeout");
    assert.equal(databaseFailureKind(named("Error", "connect ECONNREFUSED 127.0.0.1:27017", { code: "ECONNREFUSED" })), "network");
    assert.equal(databaseFailureKind(named("MongoParseError", "Invalid scheme")), "invalid_uri");
    assert.equal(databaseFailureKind(new DatabaseUnavailable("database_selection")), "database_selection");

    const secret = "mongodb+srv://shop:secret-password@cluster.example.net/shop";
    const lines = capture(() => logDatabaseFailure(named("Error", `connect failed ${secret}`)));
    assert.match(lines, /kind=unknown/);
    assert.equal(lines.includes("secret-password"), false);
    assert.equal(lines.includes("mongodb"), false);
  });

  it("reads a network failure nested under Mongoose's Atlas server-selection error", () => {
    const network = named("MongoNetworkError", "connect ECONNREFUSED 10.0.0.1:27017", { code: "ECONNREFUSED" });
    const wrapped = named("MongooseServerSelectionError", atlasMessage, {
      reason: { servers: new Map([["example.mongodb.net:27017", { type: "Unknown", error: network }]]) },
      cause: { servers: new Map([["example.mongodb.net:27017", { type: "Unknown", error: network }]]) },
    });
    const detail = describeDatabaseFailure(wrapped);
    assert.equal(detail.kind, "network");
    assert.equal(detail.phase, "server_selection");
    assert.equal(detail.errorName, "MongooseServerSelectionError");
    assert.equal(detail.causeName, "MongoNetworkError");
    assert.equal(detail.networkCode, "ECONNREFUSED");
    const lines = capture(() => logDatabaseFailure(wrapped, "bom1::iad1::request-id"));
    assert.match(lines, /kind=network phase=server_selection name=MongooseServerSelectionError cause=MongoNetworkError networkCode=ECONNREFUSED request=bom1::iad1::request-id/);
    assert.equal(lines.includes("whitelist"), false);
    assert.equal(lines.includes("https://"), false);
    assert.equal(lines.includes("10.0.0.1"), false);
  });

  it("does not treat Mongoose's whitelist paragraph as a network error when no server error is present", () => {
    const wrapped = named("MongooseServerSelectionError", atlasMessage, {
      reason: { servers: new Map([["example.mongodb.net:27017", { type: "Unknown", error: null }]]) },
    });
    const detail = describeDatabaseFailure(wrapped);
    assert.equal(detail.kind, "unknown");
    assert.equal(detail.phase, "server_selection");
    assert.equal(detail.errorName, "MongooseServerSelectionError");
    const lines = capture(() => logDatabaseFailure(wrapped));
    assert.match(lines, /kind=unknown phase=server_selection name=MongooseServerSelectionError/);
    assert.equal(lines.includes("network"), false);
    assert.equal(lines.includes("whitelist"), false);
  });

  it("classifies an authentication failure wrapped by server selection", () => {
    const auth = named("MongoServerError", "Authentication failed.", { code: 18, codeName: "AuthenticationFailed" });
    const wrapped = named("MongoServerSelectionError", "bad auth : authentication failed", { cause: auth });
    const detail = describeDatabaseFailure(wrapped);
    assert.equal(detail.kind, "invalid_credentials");
    assert.equal(detail.phase, "authentication");
    assert.equal(detail.codeName, "AuthenticationFailed");
    assert.equal(detail.mongoCode, 18);
    const lines = capture(() => logDatabaseFailure(new DatabaseUnavailable(detail)));
    assert.match(lines, /kind=invalid_credentials phase=authentication name=MongoServerSelectionError cause=MongoServerError codeName=AuthenticationFailed mongoCode=18/);
    assert.equal(lines.includes("Authentication failed"), false);
  });

  it("rejects a request id that could carry a secret and refuses a missing URI", async () => {
    const lines = capture(() => logDatabaseFailure(named("MongoNetworkError", "socket closed", { code: "ECONNRESET" }), "mongodb+srv://user:secret@host"));
    assert.match(lines, /networkCode=ECONNRESET/);
    assert.equal(lines.includes("request="), false);
    assert.equal(lines.includes("secret"), false);

    const previous = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      await assert.rejects(getDb(), (error: unknown) => error instanceof DatabaseUnavailable && error.kind === "missing_uri" && error.detail.phase === "connection" && !error.message.includes("mongodb"));
    } finally {
      if (previous === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previous;
    }
  });
});

function named(name: string, message: string, fields: Record<string, unknown> = {}) {
  const error = new Error(message);
  error.name = name;
  return Object.assign(error, fields);
}

function capture(run: () => void) {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line?: unknown) => {
    lines.push(String(line));
  };
  try {
    run();
    return lines.join("\n");
  } finally {
    console.error = original;
  }
}
