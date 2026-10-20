import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DatabaseUnavailable, databaseFailureKind, getDb, logDatabaseFailure } from "@/lib/mongodb";

describe("database failure diagnostics", () => {
  it("classifies connection failures and omits the connection string from the log", () => {
    assert.equal(databaseFailureKind(new Error("querySrv ENOTFOUND cluster.example.net")), "dns");
    assert.equal(databaseFailureKind(new Error("bad auth : authentication failed")), "invalid_credentials");
    assert.equal(databaseFailureKind(new Error("Server selection timed out after 8000 ms")), "timeout");
    assert.equal(databaseFailureKind(new Error("connect ECONNREFUSED 127.0.0.1:27017")), "network");
    assert.equal(databaseFailureKind(new Error("MongoParseError: Invalid scheme")), "invalid_uri");
    assert.equal(databaseFailureKind(new DatabaseUnavailable("database_selection")), "database_selection");

    const secret = "mongodb+srv://shop:secret-password@cluster.example.net/shop";
    const lines: string[] = [];
    const original = console.error;
    console.error = (line?: unknown) => {
      lines.push(String(line));
    };
    try {
      logDatabaseFailure(new Error(`connect failed ${secret}`));
    } finally {
      console.error = original;
    }
    assert.equal(lines.join("\n"), "Database unavailable: unknown");
    assert.equal(lines.join("\n").includes("secret-password"), false);
    assert.equal(lines.join("\n").includes("mongodb"), false);
  });

  it("refuses to connect when MONGODB_URI is missing", async () => {
    const previous = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    try {
      await assert.rejects(getDb(), (error: unknown) => error instanceof DatabaseUnavailable && error.kind === "missing_uri" && !error.message.includes("mongodb"));
    } finally {
      if (previous === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previous;
    }
  });
});
