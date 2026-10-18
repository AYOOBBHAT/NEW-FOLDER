import { existsSync, readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { prepareDatabase } from "../lib/mongodb";
import { markTaxonomySeeded, seedTaxonomy } from "../lib/seed";

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

loadEnv(".env");
loadEnv(".env.local");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI before seeding.");
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db();
  await prepareDatabase(db);
  await seedTaxonomy(db);
  await markTaxonomySeeded(db);
  const products = await db.collection("products").countDocuments();
  console.log(`Categories and collections are ready. Product records were not changed (${products} existing).`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
