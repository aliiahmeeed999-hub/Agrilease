import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// A fresh, disposable SQLite database, migrated once when the Vitest process
// starts (not per test file) and thrown away when the OS cleans the temp dir.
// Real Prisma Client + real SQLite, not a mocked query layer, so tests exercise
// actual constraints (unique email, foreign keys, cascade deletes) rather than
// whatever a hand-written mock assumes those constraints do.
const testDir = mkdtempSync(path.join(tmpdir(), "agrilease-test-"));
const databaseUrl = `file:${path.join(testDir, "test.db").replace(/\\/g, "/")}`;

execSync("npx prisma migrate deploy", {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // All test files share one real SQLite file (via better-sqlite3, a
    // synchronous, file-locking driver) rather than a mocked query layer -
    // running files in parallel worker threads lets their transactions
    // contend for that single file's lock and intermittently blow Prisma's
    // interactive-transaction timeout ("Operation has timed out") under load,
    // even though each transaction is individually correct (confirmed by
    // running the failing file alone). Serializing avoids that contention.
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    env: {
      DATABASE_URL: databaseUrl,
      // Distinct from the real dev secret and from the removed placeholder, so
      // src/lib/auth/jwt.ts's startup guard doesn't reject the test run.
      JWT_SECRET: "test-only-secret-3f9a7c2b6e1d4058b9a2c7f1e6d3a8b4",
    },
  },
});
