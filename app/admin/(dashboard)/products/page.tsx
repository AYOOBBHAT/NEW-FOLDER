import Link from "next/link";
import { listAdminProducts } from "@/lib/catalog-admin";
import { formatPrice } from "@/lib/format";
import { getDb } from "@/lib/mongodb";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.slice(0, 80) : "";
  const pageValue = typeof raw.page === "string" && /^\d+$/.test(raw.page) ? Number(raw.page) : 1;
  const page = Math.min(Math.max(pageValue, 1), 500);
  try {
    const db = await getDb();
    const result = await listAdminProducts(db, { page, q });
    const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
    return (
      <>
        <h1>Pieces</h1>
        <p className="help">Attributes stay separate from category and collection membership. Unpublished pieces are hidden from the shop.</p>
        <p>
          <Link className="button" href="/admin/products/new">
            Add a piece
          </Link>
        </p>
        <form className="search-form" action="/admin/products">
          <input name="q" defaultValue={q} placeholder="Search by name" aria-label="Search by name" />
          <button className="button-secondary" type="submit">
            Search
          </button>
        </form>
        {result.products.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Categories</th>
                  <th>Collections</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/admin/products/${product.id}`}>{product.name}</Link>
                    </td>
                    <td>{formatPrice(product.price)}</td>
                    <td>{product.categories.join(", ") || "—"}</td>
                    <td>{product.collections.join(", ") || "—"}</td>
                    <td>{product.archived ? "Archived" : product.published ? "Published" : "Unpublished"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No pieces yet. Add one when you are ready to record its verified details.</p>
        )}
        {pages > 1 ? (
          <p>
            {page > 1 ? <Link href={`/admin/products?page=${page - 1}&q=${encodeURIComponent(q)}`}>Previous</Link> : null}{" "}
            Page {page} of {pages}{" "}
            {page < pages ? <Link href={`/admin/products?page=${page + 1}&q=${encodeURIComponent(q)}`}>Next</Link> : null}
          </p>
        ) : null}
      </>
    );
  } catch {
    return <p>The database is not connected. Set MONGODB_URI and restart.</p>;
  }
}
