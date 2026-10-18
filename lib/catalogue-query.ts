import type { Db, Document } from "mongodb";
import { PAGE_SIZE, type CatalogueQuery, type RawFacetCounts } from "@/lib/catalogue-params";
import { catalogueSkip, productFilter, safeSort, scopeFilter, toPublicCard } from "@/lib/catalogue-filter";
import type { ProductDoc, PublicProductCard } from "@/lib/types";

export type CatalogueQueryResult = {
  products: PublicProductCard[];
  total: number;
  scopeCount: number;
  rawFacets: RawFacetCounts;
};

export async function queryCatalogue(
  db: Db,
  args: { categoryId: unknown; collectionId: unknown; query: CatalogueQuery },
): Promise<CatalogueQueryResult> {
  const scope = scopeFilter(args.categoryId, args.collectionId);
  const filter = productFilter(scope, args.query);
  const sort = safeSort(args.query.sort);
  const products = db.collection<ProductDoc>("products");

  const [docs, total, scopeCount, rawFacets] = await Promise.all([
    products
      .find(filter)
      .sort(sort)
      .skip(catalogueSkip(args.query.page))
      .limit(PAGE_SIZE)
      .maxTimeMS(3000)
      .toArray(),
    products.countDocuments(filter, { maxTimeMS: 3000 }),
    products.countDocuments(scope, { maxTimeMS: 3000 }),
    facetCounts(db, scope),
  ]);

  return {
    products: docs.map(toPublicCard),
    total,
    scopeCount,
    rawFacets,
  };
}

async function facetCounts(db: Db, scope: Document): Promise<RawFacetCounts> {
  const [result] = await db
    .collection<ProductDoc>("products")
    .aggregate<{
      materials: { _id: string; count: number }[];
      designTypes: { _id: string; count: number }[];
      colors: { _id: string; count: number }[];
      techniques: { _id: string; count: number }[];
      availability: { _id: string; count: number }[];
      price: { min: number; max: number; count: number }[];
    }>([
      { $match: scope },
      {
        $facet: {
          materials: [
            { $match: { material: { $type: "string" } } },
            { $group: { _id: "$material", count: { $sum: 1 } } },
          ],
          designTypes: [
            { $match: { designType: { $type: "string" } } },
            { $group: { _id: "$designType", count: { $sum: 1 } } },
          ],
          colors: [
            { $unwind: { path: "$colors", preserveNullAndEmptyArrays: false } },
            { $group: { _id: "$colors", count: { $sum: 1 } } },
          ],
          techniques: [
            { $unwind: { path: "$techniques", preserveNullAndEmptyArrays: false } },
            { $group: { _id: "$techniques", count: { $sum: 1 } } },
          ],
          availability: [
            { $match: { stockStatus: { $type: "string" } } },
            { $group: { _id: "$stockStatus", count: { $sum: 1 } } },
          ],
          price: [
            { $match: { price: { $type: "number" } } },
            { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" }, count: { $sum: 1 } } },
          ],
        },
      },
    ])
    .toArray();

  const empty: RawFacetCounts = {
    materials: [],
    designTypes: [],
    colors: [],
    techniques: [],
    availability: [],
    price: null,
  };
  if (!result) return empty;
  const price = result.price[0];
  return {
    materials: mapCounts(result.materials),
    designTypes: mapCounts(result.designTypes),
    colors: mapCounts(result.colors),
    techniques: mapCounts(result.techniques),
    availability: mapCounts(result.availability),
    price: price && price.count > 0 ? { min: price.min, max: price.max, count: price.count } : null,
  };
}

function mapCounts(rows: { _id: string; count: number }[]) {
  return rows
    .filter((row) => typeof row._id === "string" && row.count > 0)
    .map((row) => ({ value: row._id, count: row.count }));
}
