import { execSync } from "node:child_process";
import { resetTestDatabase } from "./utils/db";

async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required to run E2E tests.");
  }

  execSync("pnpm exec prisma migrate deploy --schema prisma/schema.prisma", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
  });

  await resetTestDatabase();
}

export default globalSetup;
