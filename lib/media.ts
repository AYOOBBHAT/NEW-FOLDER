import type { Db } from "mongodb";
import { destroyImage } from "@/lib/cloudinary";

export async function releaseUnreferencedImages(db: Db, publicIds: string[], destroy: (publicId: string) => Promise<void> = destroyImage) {
  const warnings: string[] = [];
  const deleted: string[] = [];
  for (const publicId of [...new Set(publicIds.filter(Boolean))]) {
    const references = await db.collection("products").countDocuments({ "images.publicId": publicId });
    if (references > 0) continue;
    try {
      await destroy(publicId);
      deleted.push(publicId);
    } catch {
      warnings.push("A removed photograph is still stored because image hosting could not delete it.");
    }
  }
  return { warnings: [...new Set(warnings)], deleted };
}
