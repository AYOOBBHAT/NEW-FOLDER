import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatalogueSearch,
  defaultCatalogueQuery,
  hasActiveFilters,
  parseCatalogueParams,
  parsePriceInput,
  presentFacets,
  type RawFacetCounts,
} from "@/lib/catalogue-params";
import { productFilter, safeSort } from "@/lib/catalogue-filter";
import { isSameOrigin } from "@/lib/origin";
import { adminCredentialsMatch } from "@/lib/password";
import { slugify } from "@/lib/slug";

describe("catalogue parameters", () => {
  it("rejects unknown filters and sort injection", () => {
    assert.equal(parseCatalogueParams(new URLSearchParams("sort[$gt]=1")).ok, false);
    assert.equal(parseCatalogueParams(new URLSearchParams("material[$ne]=pashmina")).ok, false);
    assert.equal(parseCatalogueParams(new URLSearchParams("sort=price")).ok, false);
    assert.equal(parseCatalogueParams(new URLSearchParams("material=kashmiri-guess")).ok, false);
  });

  it("accepts repeated and comma-separated controlled values", () => {
    const parsed = parseCatalogueParams(new URLSearchParams("material=wool&material=pashmina,pashmina&color=ivory"));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.query.materials, ["pashmina", "wool"]);
    assert.deepEqual(parsed.query.colors, ["ivory"]);
    assert.equal(parsed.query.sort, "featured");
  });

  it("round-trips a canonical query and omits defaults", () => {
    const query = {
      ...defaultCatalogueQuery(),
      sort: "price_asc" as const,
      page: 2,
      minPrice: 5000,
      materials: ["pashmina", "wool"],
    };
    const search = buildCatalogueSearch(query);
    assert.equal(search.includes("sort=featured"), false);
    const parsed = parseCatalogueParams(new URLSearchParams(search));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.query, query);
  });

  it("rejects a reversed price range and unsafe price text", () => {
    assert.equal(parseCatalogueParams(new URLSearchParams("minPrice=20&maxPrice=10")).ok, false);
    assert.equal(parseCatalogueParams(new URLSearchParams("minPrice=10.5")).ok, false);
    assert.equal(parseCatalogueParams(new URLSearchParams("page=0")).ok, false);
    assert.equal(parsePriceInput("010"), 10);
    assert.equal(parsePriceInput(""), null);
    assert.equal(parsePriceInput("$10"), "invalid");
  });

  it("hides facet values that no published product uses", () => {
    const raw: RawFacetCounts = {
      materials: [{ value: "pashmina", count: 2 }, { value: "from-photo", count: 4 }],
      designTypes: [],
      colors: [{ value: "ivory", count: 1 }, { value: "navy", count: 0 }],
      techniques: [],
      availability: [{ value: "in_stock", count: 2 }],
      price: { min: 1000, max: 1000, count: 2 },
    };
    const facets = presentFacets(raw);
    assert.deepEqual(facets.materials.map((item) => item.value), ["pashmina"]);
    assert.deepEqual(facets.colors.map((item) => item.value), ["ivory"]);
    assert.equal(facets.designTypes.length, 0);
    assert.equal(facets.techniques.length, 0);
    assert.equal(facets.price?.min, 1000);
  });

  it("keeps public filters published even if a scope is tampered", () => {
    const filter = productFilter({ published: false, categoryIds: "ignored" }, defaultCatalogueQuery());
    assert.equal(filter.published, true);
    assert.deepEqual(filter.archived, { $ne: true });
    assert.equal(hasActiveFilters(defaultCatalogueQuery()), false);
  });

  it("only sorts by allowlisted fields", () => {
    for (const sort of ["featured", "newest", "price_asc", "price_desc"] as const) {
      const value = safeSort(sort);
      assert.equal(Object.values(value).every((direction) => direction === 1 || direction === -1), true);
      assert.equal(Object.keys(value).every((key) => ["featured", "featuredRank", "createdAt", "price", "_id"].includes(key)), true);
    }
  });
});

describe("controlled writing", () => {
  it("slugifies category names without inventing attributes", () => {
    assert.equal(slugify("Plain & Minimal Shawls"), "plain-and-minimal-shawls");
  });

  it("compares admin credentials without a short-circuit on the email", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "correct-horse";
    process.env.ADMIN_SESSION_SECRET = "12345678901234567890123456789012";
    assert.equal(adminCredentialsMatch("admin@example.com", "correct-horse"), true);
    assert.equal(adminCredentialsMatch("admin@example.com", "wrong-password"), false);
    assert.equal(adminCredentialsMatch("other@example.com", "correct-horse"), false);
  });

  it("requires a same-origin mutation", () => {
    assert.equal(isSameOrigin(new Request("https://shop.example/api", { headers: { origin: "https://shop.example", host: "shop.example" } })), true);
    assert.equal(isSameOrigin(new Request("https://shop.example/api", { headers: { origin: "https://evil.example", host: "shop.example" } })), false);
  });
});
