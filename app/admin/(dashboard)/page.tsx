import Link from "next/link";
import { adminDatabaseNotice } from "@/components/admin/database-notice";
import { getDb } from "@/lib/mongodb";

export default async function AdminHomePage() {
  try {
    const db = await getDb();
    const [pieces, published, categories, collections] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("products").countDocuments({ published: true }),
      db.collection("categories").countDocuments(),
      db.collection("collections").countDocuments(),
    ]);
    return (
      <>
        <h1>Overview</h1>
        <p className="muted">Categories and collections are documents. A shawl stays one record and can belong to several of each.</p>
        <div className="stats">
          <div className="stat">
            <strong>{pieces}</strong>Pieces
          </div>
          <div className="stat">
            <strong>{published}</strong>Published
          </div>
          <div className="stat">
            <strong>{categories}</strong>Categories
          </div>
          <div className="stat">
            <strong>{collections}</strong>Collections
          </div>
        </div>
        <p>
          <Link className="button" href="/admin/products/new">
            Add a piece
          </Link>
        </p>
      </>
    );
  } catch (error) {
    return adminDatabaseNotice(error);
  }
}
