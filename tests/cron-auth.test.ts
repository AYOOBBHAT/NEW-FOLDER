import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cronRequestAuthorized } from "@/lib/cron-auth";

describe("cron authorization", () => {
  it("accepts only a bearer token that matches a long server secret", () => {
    const previous = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      assert.equal(cronRequestAuthorized("Bearer cron-secret-value"), false);
      process.env.CRON_SECRET = "too-short";
      assert.equal(cronRequestAuthorized("Bearer too-short"), false);
      process.env.CRON_SECRET = "cron-secret-value";
      assert.equal(cronRequestAuthorized("Bearer cron-secret-value"), true);
      assert.equal(cronRequestAuthorized("bearer cron-secret-value"), false);
      assert.equal(cronRequestAuthorized("cron-secret-value"), false);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});
