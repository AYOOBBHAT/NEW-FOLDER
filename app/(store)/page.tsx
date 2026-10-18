import Link from "next/link";
import { getPublishedTaxonomy } from "@/lib/storefront";

export default async function HomePage() {
  let taxonomy: Awaited<ReturnType<typeof getPublishedTaxonomy>> | null = null;
  try {
    taxonomy = await getPublishedTaxonomy();
  } catch {
    taxonomy = null;
  }

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">Kashmiri shawls</p>
          <h1>
            Pieces with a <em>quiet</em> standard.
          </h1>
          <p className="hero-copy">
            Embroidered, plain, and traditional shawls, with a few edited collections beside the full catalogue.
            Fibre and craft are named only when they have been verified.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/shop">
              Shop all
            </Link>
            <span className="muted">{taxonomy ? `${taxonomy.shopCount} published` : "Catalogue"}</span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Categories</h2>
            <Link href="/shop">Shop all</Link>
          </div>
          <div className="taxon-grid">
            {(taxonomy?.categories ?? []).map((category, index) => (
              <Link className="taxon-card" key={category.id} href={category.href}>
                <span>0{index + 1}</span>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                {category.productCount > 0 ? <p>{category.productCount} published</p> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Collections</h2>
          </div>
          <div className="collection-list">
            {(taxonomy?.collections ?? []).map((collection, index) => (
              <Link key={collection.id} href={collection.href}>
                <span>0{index + 1}</span>
                <strong>{collection.name}</strong>
                <em className="muted">{collection.productCount > 0 ? `${collection.productCount} published` : "Curated"}</em>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
