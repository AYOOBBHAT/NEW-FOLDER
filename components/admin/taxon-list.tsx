import Link from "next/link";
import { listTaxons, type TaxonKind } from "@/lib/catalog-admin";
import { getDb } from "@/lib/mongodb";

export async function TaxonList({ kind }: { kind: TaxonKind }) {
  const noun = kind === "category" ? "Categories" : "Collections";
  const href = kind === "category" ? "/admin/categories" : "/admin/collections";
  try {
    const db = await getDb();
    const items = await listTaxons(db, kind);
    return (
      <>
        <h1>{noun}</h1>
        <p>
          <Link className="button" href={`${href}/new`}>
            New {kind}
          </Link>
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Published pieces</th>
                <th>All pieces</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`${href}/${item.id}`}>{item.name}</Link>
                  </td>
                  <td>{item.slug}</td>
                  <td>{item.publishedCount}</td>
                  <td>{item.totalCount}</td>
                  <td>{item.published ? "Published" : "Hidden"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } catch {
    return <p>The database is not connected. Set MONGODB_URI and restart.</p>;
  }
}
