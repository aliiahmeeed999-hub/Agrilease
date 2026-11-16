import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { execSync } from "node:child_process";
import "dotenv/config";

// Tests run against a real PostgreSQL database (TEST_DATABASE_URL), not a
// mocked query layer, so they exercise actual constraints (unique email,
// foreign keys, cascade deletes). The database is wiped and migrated once
// when Vitest starts: it must be a database used only for tests, never the
// development or production one.
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Point it at a PostgreSQL database used only for tests (see .env.example).");
}
if (databaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must not be the same database as DATABASE_URL: the test run wipes it.");
}

execSync("npx prisma migrate reset --force", {
  env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_SKIP_SEED: "1" },
  stdio: "inherit",
});

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Test files share one database; running them one at a time keeps their
    // data from interfering and avoids transaction contention.
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    env: {
      DATABASE_URL: databaseUrl,
      // Distinct from the real dev secret and from the removed placeholder, so
      // src/lib/auth/jwt.ts's startup guard doesn't reject the test run.
      JWT_SECRET: "test-only-secret-3f9a7c2b6e1d4058b9a2c7f1e6d3a8b4",
      // Tests never call the real Gemini API (it costs money and is not
      // deterministic). Tests that cover the Gemini path set a fake key and
      // stub fetch themselves.
      GEMINI_API_KEY: "",
    },
  },
});
