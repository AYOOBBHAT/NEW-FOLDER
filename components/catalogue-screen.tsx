import { notFound } from "next/navigation";
import { CatalogueControls } from "@/components/catalogue-controls";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-grid";
import { PAGE_SIZE, parseCatalogueParams } from "@/lib/catalogue-params";
import { getDb } from "@/lib/mongodb";
import { loadCatalogue, readSearchParams, type CatalogueScope } from "@/lib/storefront";

export async function CatalogueScreen({
  scope,
  searchParams,
}: {
  scope: CatalogueScope;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = parseCatalogueParams(readSearchParams(raw));
  const pathname = scope.type === "shop" ? "/shop" : scope.type === "category" ? `/categories/${scope.slug}` : `/collections/${scope.slug}`;

  try {
    await getDb();
  } catch {
    return (
      <section className="catalogue wrap">
        <h1>Catalogue unavailable</h1>
        <p className="muted">The shop can’t be reached just now. Check the database connection and try again.</p>
      </section>
    );
  }

  if (!parsed.ok) {
    return (
      <section className="catalogue wrap">
        <p className="eyebrow">Catalogue</p>
        <h1>Those filters aren’t available</h1>
        <p className="muted">{parsed.message}</p>
        <p>
          <a className="button" href={pathname}>
            Clear filters
          </a>
        </p>
      </section>
    );
  }

  const result = await loadCatalogue(scope, parsed.query);
  if (result.type === "not_found") notFound();

  const emptyMessage =
    result.scopeCount === 0
      ? "No published pieces here yet."
      : result.total === 0
        ? "No pieces match these filters."
        : "There are no pieces on this page.";

  return (
    <section className="catalogue">
      <div className="wrap">
        <div className="catalogue-intro">
          <p className="eyebrow">{result.eyebrow}</p>
          <h1>{result.title}</h1>
          <p className="muted">{result.description}</p>
        </div>
        <CatalogueControls
          pathname={result.pathname}
          query={result.query}
          facets={result.facets}
          total={result.total}
          scopeCount={result.scopeCount}
          pageSize={PAGE_SIZE}
        >
          <ProductGrid products={result.products} emptyMessage={emptyMessage} />
          <Pagination
            pathname={result.pathname}
            query={result.query}
            page={result.query.page}
            pageSize={PAGE_SIZE}
            total={result.total}
          />
        </CatalogueControls>
      </div>
    </section>
  );
}
