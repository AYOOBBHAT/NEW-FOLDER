"use client";

import Image from "next/image";
import { buildDeliveryUrl, isCloudinaryDeliveryUrl } from "@/lib/image-delivery";

export function ProductPhoto({
  src,
  alt,
  cloudName,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  cloudName: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}) {
  if (!isCloudinaryDeliveryUrl(src, cloudName)) {
    return <img src={src} alt={alt} />;
  }
  const shared = {
    src,
    alt,
    sizes,
    priority,
    loader: ({ src: imageSrc, width: imageWidth, quality }: { src: string; width: number; quality?: number }) =>
      buildDeliveryUrl(imageSrc, imageWidth, quality, cloudName),
  };
  if (fill) return <Image {...shared} fill />;
  return <Image {...shared} width={width ?? 800} height={height ?? 1000} />;
}
