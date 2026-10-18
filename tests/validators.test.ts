import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORY_SEED, COLLECTION_SEED } from "@/lib/seed";
import { productInputSchema, taxonomyInputSchema } from "@/lib/validators";

const validProduct = {
  name: "Ivory border shawl",
  slug: "",
  summary: "",
  description: "",
  price: 18000,
  designType: null,
  material: null,
  colors: [],
  techniques: [],
  verifiedOrigin: null,
  stockStatus: "in_stock",
  stockQuantity: null,
  categoryIds: [],
  collectionIds: [],
  featured: false,
  featuredRank: 100,
  published: false,
  images: [],
};

describe("taxonomy documents", () => {
  it("seeds the three categories and three collections, not product attributes", () => {
    assert.deepEqual(
      CATEGORY_SEED.map((item) => item.name),
      ["Embroidered Shawls", "Plain & Minimal Shawls", "Traditional Designs"],
    );
    assert.deepEqual(
      COLLECTION_SEED.map((item) => item.name),
      ["Gift-Worthy Picks", "Signature Collection", "New Arrivals"],
    );
    for (const item of [...CATEGORY_SEED, ...COLLECTION_SEED]) {
      assert.equal("material" in item, false);
      assert.equal("techniques" in item, false);
      assert.equal(item.name.trim().length > 0, true);
      assert.equal(item.description.trim().length > 0, true);
    }
  });

  it("rejects an empty category", () => {
    const parsed = taxonomyInputSchema.safeParse({
      name: "   ",
      slug: "blank",
      description: "A real description",
      sortOrder: 0,
      published: true,
    });
    assert.equal(parsed.success, false);
  });
});

describe("product attributes", () => {
  it("rejects attributes inferred from a photograph", () => {
    const parsed = productInputSchema.safeParse({
      ...validProduct,
      materialFromImage: "pashmina",
      originFromPhoto: "Kashmir",
      authenticity: true,
    });
    assert.equal(parsed.success, false);
  });

  it("rejects a material outside the controlled list", () => {
    const parsed = productInputSchema.safeParse({ ...validProduct, material: "probably-pashmina" });
    assert.equal(parsed.success, false);
  });

  it("keeps an explicit null material and dedupes membership", () => {
    const id = "64b7f3a2c1d4e5f60718293a";
    const parsed = productInputSchema.safeParse({
      ...validProduct,
      material: null,
      categoryIds: [id, id.toUpperCase()],
      images: [{ url: "https://cdn.example.com/shawl.jpg", alt: "Folded ivory shawl on a table" }],
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.material, null);
    assert.deepEqual(parsed.data.categoryIds, [id]);
    assert.deepEqual(parsed.data.images, [
      {
        url: "https://cdn.example.com/shawl.jpg",
        alt: "Folded ivory shawl on a table",
        publicId: null,
        role: "product",
        sortOrder: 0,
        primary: false,
      },
    ]);
  });

  it("rejects a non-https photograph", () => {
    const parsed = productInputSchema.safeParse({
      ...validProduct,
      images: [{ url: "http://example.com/shawl.jpg", alt: "Shawl" }],
    });
    assert.equal(parsed.success, false);
  });
});
