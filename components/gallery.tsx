"use client";

import { useState } from "react";
import { ProductPhoto } from "@/components/product-photo";

const ROLE_LABELS = { model: "Worn", detail: "Detail", product: "" } as const;

export function Gallery({
  images,
  cloudName,
}: {
  images: { url: string; alt: string; role?: "product" | "model" | "detail" }[];
  cloudName: string;
}) {
  const [index, setIndex] = useState(0);
  if (!images.length) return <div className="product-media"><div className="weave" aria-hidden="true" /></div>;
  const current = images[index] ?? images[0];
  const role = ROLE_LABELS[current.role ?? "product"];
  return (
    <div>
      <div className="product-media">
        <ProductPhoto src={current.url} alt={current.alt} cloudName={cloudName} fill sizes="(max-width: 900px) 100vw, 42rem" priority={index === 0} />
      </div>
      {role ? <p className="help">{role}</p> : null}
      {images.length > 1 ? (
        <div className="thumbs">
          {images.map((image, imageIndex) => (
            <button key={`${image.url}-${imageIndex}`} type="button" aria-current={imageIndex === index} onClick={() => setIndex(imageIndex)}>
              <ProductPhoto src={image.url} alt="" cloudName={cloudName} width={84} height={104} sizes="84px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
