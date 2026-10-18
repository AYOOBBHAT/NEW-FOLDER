import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { Gallery } from "@/components/gallery";
import { cloudNameFromEnv } from "@/lib/image-delivery";
import { getAdminSession } from "@/lib/current-admin";
import { formatPrice } from "@/lib/format";
import { getPublicProduct } from "@/lib/storefront";
import {
  COLOR_LABELS,
  DESIGN_TYPE_LABELS,
  MATERIAL_LABELS,
  STOCK_STATUS_LABELS,
  TECHNIQUE_LABELS,
  labelFrom,
} from "@/lib/vocab";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const session = await getAdminSession();
    const product = await getPublicProduct(slug, Boolean(session));
    if (!product || (!product.published && !session)) return { title: "Piece" };
    return {
      title: product.name,
      description: product.summary || undefined,
      robots: product.published ? undefined : { index: false, follow: false },
    };
  } catch {
    return { title: "Piece" };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getAdminSession();
  let product: Awaited<ReturnType<typeof getPublicProduct>> = null;
  try {
    product = await getPublicProduct(slug, Boolean(session));
  } catch {
    return (
      <section className="wrap catalogue">
        <h1>This piece can’t be shown just now.</h1>
      </section>
    );
  }
  if (!product || (!product.published && !session)) notFound();

  const facts = [
    ["Design type", labelFrom(DESIGN_TYPE_LABELS, product.designType)],
    ["Verified material", labelFrom(MATERIAL_LABELS, product.material)],
    ["Colors", product.colors.map((color) => labelFrom(COLOR_LABELS, color)).filter(Boolean).join(", ")],
    ["Verified craft", product.techniques.map((technique) => labelFrom(TECHNIQUE_LABELS, technique)).filter(Boolean).join(", ")],
    ["Verified origin", product.verifiedOrigin],
  ].filter(([, value]) => Boolean(value));

  return (
    <article className="wrap product-page">
      <Gallery images={product.images} cloudName={cloudNameFromEnv()} />
      <div>
        {!product.published ? <p className="notice-bar">Unpublished. This piece is not in the public catalogue.</p> : null}
        <p className="detail-kicker">{STOCK_STATUS_LABELS[product.stockStatus]}</p>
        <h1>{product.name}</h1>
        <p className="price">{formatPrice(product.price)}</p>
        {product.summary ? <p>{product.summary}</p> : null}
        {facts.length ? (
          <dl className="facts">
            {facts.map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
        ) : (
          <p className="muted">Verified details have not been recorded for this piece.</p>
        )}
        <p className="help">Details appear only when they have been verified. Photographs are not used to identify fibre, craft, or origin.</p>
        {product.description ? <div className="prose">{product.description}</div> : null}
        {product.categories.length || product.collections.length ? (
          <div className="related">
            {product.categories.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.name}
              </Link>
            ))}
            {product.collections.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.name}
              </Link>
            ))}
          </div>
        ) : null}
        {product.published ? (
          <AddToCart
            productId={product.id}
            purchasable={product.stockStatus === "made_to_order" || (product.stockStatus === "in_stock" && (product.stockQuantity ?? 0) > 0)}
          />
        ) : null}
        <p>
          <Link href="/shop">Shop all</Link>
        </p>
      </div>
    </article>
  );
}
