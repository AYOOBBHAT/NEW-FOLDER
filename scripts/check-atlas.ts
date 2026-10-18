import { existsSync, readFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

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

function safeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/auth|bad auth/i.test(message)) return "authentication failed";
  if (/ENOTFOUND|getaddrinfo|timed out|timeout|ECONN/i.test(message)) return "server unreachable";
  return "connection failed";
}

async function main() {
  loadEnv(".env");
  loadEnv(".env.local");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Atlas was not contacted.");
    process.exit(1);
  }
  if (uri.includes("<") || uri.includes(">")) {
    console.error("MONGODB_URI still contains a placeholder. Atlas was not contacted.");
    process.exit(1);
  }

  const slug = `atlas-check-${Date.now()}`;
  let id: ObjectId | null = null;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });
    console.log("Atlas ping succeeded.");
    const now = new Date();
    const inserted = await db.collection("products").insertOne({
      slug,
      name: "Atlas connectivity check",
      summary: "",
      description: "",
      price: 1,
      currency: "INR",
      designType: null,
      material: null,
      colors: [],
      techniques: [],
      verifiedOrigin: null,
      stockStatus: "sold_out",
      stockQuantity: 0,
      categoryIds: [],
      collectionIds: [],
      featured: false,
      featuredRank: 9999,
      published: false,
      publishedAt: null,
      archived: true,
      images: [],
      createdAt: now,
      updatedAt: now,
    });
    id = inserted.insertedId;
    await db.collection("products").updateOne({ _id: id }, { $set: { price: 2, updatedAt: new Date() } });
    await client.close();

    const again = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await again.connect();
    const reread = await again.db().collection("products").findOne({ _id: id });
    if (!reread || reread.price !== 2 || reread.published !== false) {
      console.error("The check product was not readable after reconnect.");
      await again.close();
      process.exit(1);
    }
    const deleted = await again.db().collection("products").deleteOne({ _id: id, slug });
    await again.close();
    if (deleted.deletedCount !== 1) {
      console.error("The check product could not be removed.");
      process.exit(1);
    }
    console.log("Product create, update, reconnect read, and removal succeeded.");
  } catch (error) {
    console.error(`Atlas check failed: ${safeFailure(error)}`);
    if (id) {
      await client
        .db()
        .collection("products")
        .deleteOne({ _id: id, slug })
        .catch(() => undefined);
    }
    await client.close().catch(() => undefined);
    process.exit(1);
  }
}

main();
