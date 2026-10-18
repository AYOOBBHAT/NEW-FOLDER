import { inspectImage, uploadProductImage } from "@/lib/cloudinary";
import { InputError } from "@/lib/errors";
import { releaseUnreferencedImages } from "@/lib/media";
import { json, readJson, withAdmin } from "@/lib/api";
import { parseInput, imageRemovalSchema } from "@/lib/validators";

export const runtime = "nodejs";

const ROLES = new Set(["product", "model", "detail"]);

export async function POST(request: Request) {
  return withAdmin(request, async () => {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > 6 * 1024 * 1024) throw new InputError("Photograph must be 5 MB or smaller");
    const type = request.headers.get("content-type") ?? "";
    if (!type.toLowerCase().includes("multipart/form-data")) throw new InputError("Choose a photograph");
    const form = await request.formData();
    const file = form.get("file");
    const role = form.get("role");
    if (!(file instanceof File)) throw new InputError("Choose a photograph");
    if (typeof role !== "string" || !ROLES.has(role)) throw new InputError("Choose a photograph type");
    const bytes = Buffer.from(await file.arrayBuffer());
    inspectImage(bytes, file.type);
    const uploaded = await uploadProductImage(bytes, file.type);
    return json({ ...uploaded, role });
  });
}

export async function DELETE(request: Request) {
  return withAdmin(request, async (db) => {
    const input = parseInput(imageRemovalSchema, await readJson(request));
    const released = await releaseUnreferencedImages(db, [input.publicId]);
    return json({ deleted: released.deleted.includes(input.publicId), warning: released.warnings[0] });
  });
}
