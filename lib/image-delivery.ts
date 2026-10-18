const WIDTHS = [480, 800, 1200] as const;

export function cloudNameFromEnv() {
  const name = process.env.CLOUDINARY_CLOUD_NAME || process.env.CloudName || "";
  return /^[a-z0-9_-]{1,80}$/i.test(name) ? name : "";
}

export function isCloudinaryDeliveryUrl(src: string, cloudName: string) {
  if (!cloudName) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && url.pathname.startsWith(`/${cloudName}/image/upload/`);
  } catch {
    return false;
  }
}

export function buildDeliveryUrl(src: string, width: number, quality?: number, cloudName = cloudNameFromEnv()) {
  if (!isCloudinaryDeliveryUrl(src, cloudName)) return src;
  const url = new URL(src);
  const marker = "/image/upload/";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return src;
  const rest = url.pathname.slice(index + marker.length);
  if (/^f_auto[,/]/.test(rest)) return src;
  const safeWidth = Math.max(64, Math.min(2000, Math.round(width)));
  const safeQuality = quality && quality >= 40 && quality <= 90 ? String(quality) : "auto";
  const transform = `f_auto,q_${safeQuality},c_limit,w_${safeWidth}`;
  return `https://res.cloudinary.com${url.pathname.slice(0, index)}${marker}${transform}/${rest}`;
}

export function deliverySrcSet(src: string, cloudName: string) {
  if (!isCloudinaryDeliveryUrl(src, cloudName)) return undefined;
  return WIDTHS.map((width) => `${buildDeliveryUrl(src, width, undefined, cloudName)} ${width}w`).join(", ");
}
