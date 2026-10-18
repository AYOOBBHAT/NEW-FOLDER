import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { cloudNameFromEnv } from "@/lib/image-delivery";
import { formatPrice } from "@/lib/format";
import type { PublicProductCard } from "@/lib/types";
import { COLOR_SWATCHES, labelFrom, MATERIAL_LABELS, STOCK_STATUS_LABELS, type ColorValue } from "@/lib/vocab";

export function ProductGrid({ products, emptyMessage }: { products: PublicProductCard[]; emptyMessage: string }) {
  if (!products.length) return <p className="empty">{emptyMessage}</p>;
  const cloudName = cloudNameFromEnv();
  return (
    <div className="product-grid">
      {products.map((product) => {
        const material = labelFrom(MATERIAL_LABELS, product.material);
        const stock = product.stockStatus === "in_stock" ? null : STOCK_STATUS_LABELS[product.stockStatus];
        return (
          <article key={product.id}>
            <Link className="product-card" href={`/products/${product.slug}`}>
              <div className="product-media">
                {product.image ? (
                  <ProductPhoto src={product.image.url} alt={product.image.alt} cloudName={cloudName} fill sizes="(max-width: 700px) 100vw, 22rem" />
                ) : (
                  <div className="weave" aria-hidden="true" />
                )}
              </div>
              <div className="product-copy">
                {material ? <p className="product-kicker">{material}</p> : null}
                <h2>{product.name}</h2>
                <p className="price">{formatPrice(product.price)}</p>
                {stock ? <p className="stock">{stock}</p> : null}
                {product.colors.length ? (
                  <div className="dots" aria-label="Colors">
                    {product.colors.map((color) => (
                      <i
                        key={color}
                        className="swatch"
                        style={{ background: safeSwatch(COLOR_SWATCHES[color as ColorValue]) }}
                        title={color}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function safeSwatch(value: string | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "transparent";
}
