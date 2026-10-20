import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { policyLinks, site } from "@/lib/site";
import nextConfig from "../next.config";

describe("deploy readiness", () => {
  it("canonicalizes the apex host to www", async () => {
    assert.equal(site.url, "https://www.kashmiriloom.com");
    if (!nextConfig.redirects) throw new Error("Apex redirect is not configured");
    const redirects = await nextConfig.redirects();
    assert.deepEqual(redirects, [
      {
        source: "/:path*",
        has: [{ type: "host", value: "kashmiriloom.com" }],
        destination: "https://www.kashmiriloom.com/:path*",
        permanent: true,
      },
    ]);
  });

  it("lists the public pages and marks private routes noindex", async () => {
    if (!nextConfig.headers) throw new Error("Private route headers are not configured");
    const headers = await nextConfig.headers();
    assert.deepEqual(
      headers.map((header) => header.source),
      ["/admin/:path*", "/api/:path*", "/cart/:path*", "/checkout/:path*", "/orders/:path*"],
    );
    for (const header of headers) {
      assert.deepEqual(header.headers, [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]);
    }
    assert.equal(robots().sitemap, "https://www.kashmiriloom.com/sitemap.xml");
    assert.deepEqual(robots().rules, {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/cart", "/checkout", "/orders"],
    });
    assert.deepEqual(
      sitemap().map((entry) => entry.url),
      ["https://www.kashmiriloom.com/", "https://www.kashmiriloom.com/shop", ...policyLinks.map((link) => `https://www.kashmiriloom.com${link.href}`)],
    );
  });

  it("schedules the reservation route without logging the secret", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
      crons: { path: string; schedule: string }[];
    };
    assert.deepEqual(config.crons, [{ path: "/api/cron/release-reservations", schedule: "*/5 * * * *" }]);
    const route = readFileSync(new URL("../app/api/cron/release-reservations/route.ts", import.meta.url), "utf8");
    const auth = readFileSync(new URL("../lib/cron-auth.ts", import.meta.url), "utf8");
    assert.equal(route.includes("console."), false);
    assert.equal(auth.includes("console."), false);
    assert.match(route, /Authorization: Bearer/);
    assert.doesNotMatch(route, /NEXT_PUBLIC_CRON_SECRET/);
  });
});
