import { existsSync, readFileSync } from "node:fs";
import { destroyImage, imageStorageStatus, uploadProductImage } from "../lib/cloudinary";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  loadEnv(".env");
  loadEnv(".env.local");
  const status = imageStorageStatus();
  if (!status.configured) {
    console.error(`Image storage is not configured. Missing: ${status.missing.join(", ")}`);
    process.exit(1);
  }

  let publicId = "";
  try {
    const uploaded = await uploadProductImage(PNG, "image/png");
    publicId = uploaded.publicId;
    const url = new URL(uploaded.secureUrl);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
      throw new Error("delivery host mismatch");
    }
    console.log("Cloudinary upload succeeded. Delivery host is res.cloudinary.com.");
    await destroyImage(publicId);
    publicId = "";
    console.log("Cloudinary test asset was deleted.");
  } catch {
    console.error(publicId ? `Cloudinary check failed. Test asset remains: ${publicId}` : "Cloudinary check failed.");
    if (publicId) {
      await destroyImage(publicId).catch(() => undefined);
    }
    process.exit(1);
  }
}

main();
