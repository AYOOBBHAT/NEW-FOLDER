import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const server = await MongoMemoryServer.create();
  const uri = server.getUri("kashmir_shawls");
  const env = {
    ...process.env,
    MONGODB_URI: uri,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "admin@shawlhouse.local",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "shawl-admin-local",
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET ?? "local-dev-session-secret-32chars-min",
  };

  console.log("Ephemeral MongoDB is running. Product data is discarded when this process stops.");
  console.log(`Admin email: ${env.ADMIN_EMAIL}`);

  const child = spawn("npx", ["next", "dev"], { stdio: "inherit", env, shell: true });

  async function shutdown() {
    child.kill();
    await server.stop();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  child.on("exit", () => void server.stop());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
