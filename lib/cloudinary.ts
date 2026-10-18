import { v2 as cloudinary } from "cloudinary";
import { InputError } from "@/lib/errors";
import { cloudNameFromEnv } from "@/lib/image-delivery";

const MAX_BYTES = 5 * 1024 * 1024;

export function imageStorageStatus() {
  const missing: string[] = [];
  if (!cloudNameFromEnv()) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!process.env.CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!process.env.CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");
  return missing.length ? { configured: false as const, missing } : { configured: true as const, missing: [] as string[] };
}

function client() {
  const status = imageStorageStatus();
  if (!status.configured) throw new InputError("Image storage is not configured");
  cloudinary.config({
    cloud_name: cloudNameFromEnv(),
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export function inspectImage(bytes: Buffer, mime: string) {
  if (bytes.length === 0) throw new InputError("Choose a photograph");
  if (bytes.length > MAX_BYTES) throw new InputError("Photograph must be 5 MB or smaller");
  const kind = sniff(bytes);
  const expected =
    kind === "jpg" ? "image/jpeg" : kind === "png" ? "image/png" : kind === "webp" ? "image/webp" : kind === "avif" ? "image/avif" : "";
  if (!kind || mime !== expected) throw new InputError("Use a JPEG, PNG, WebP, or AVIF photograph");
  return kind;
}

export async function uploadProductImage(bytes: Buffer, mime: string) {
  const kind = inspectImage(bytes, mime);
  const cloud = cloudNameFromEnv();
  const uploaded = await client().uploader.upload(`data:${mime};base64,${bytes.toString("base64")}`, {
    folder: "shawl-house/products",
    resource_type: "image",
    allowed_formats: [kind === "jpg" ? "jpg" : kind],
    unique_filename: true,
    overwrite: false,
    type: "upload",
  });
  const secureUrl = uploaded.secure_url;
  const publicId = uploaded.public_id;
  if (!secureUrl.startsWith(`https://res.cloudinary.com/${cloud}/`) || !publicId.startsWith("shawl-house/products/")) {
    await client()
      .uploader.destroy(publicId, { resource_type: "image", invalidate: true })
      .catch(() => undefined);
    throw new InputError("The photograph could not be stored");
  }
  return { secureUrl, publicId };
}

export async function destroyImage(publicId: string) {
  if (!/^shawl-house\/products\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(publicId) || publicId.includes("..")) {
    throw new InputError("That photograph reference is not valid");
  }
  const result = await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new InputError("The photograph could not be removed from image storage");
  }
}

function sniff(bytes: Buffer) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg" as const;
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png" as const;
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp" as const;
  if (bytes.length > 16 && bytes.toString("ascii", 4, 8) === "ftyp") {
    const brand = bytes.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "avif" as const;
  }
  return null;
}
