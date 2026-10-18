import { getAdminSession } from "@/lib/current-admin";
import { imageStorageStatus } from "@/lib/cloudinary";
import { json } from "@/lib/api";
import { pingDatabase } from "@/lib/mongodb";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const images = imageStorageStatus();
  const imageStorage = images.configured ? "configured" : "not configured";
  try {
    await pingDatabase();
    return json({ database: "ok", imageStorage, missingImageSettings: images.missing });
  } catch {
    return json({ database: "unavailable", imageStorage, missingImageSettings: images.missing }, 503);
  }
}
