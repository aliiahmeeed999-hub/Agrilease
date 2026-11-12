import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Runs the exact same test suite as vitest.config.ts, but against a real
// Postgres instance instead of the ephemeral SQLite temp DB, to genuinely
// exercise the ORM/query layer on both engines rather than assuming Prisma's
// provider-agnostic query API means identical runtime behavior. Requires a
// Postgres server already running and migrated - see
// PROJECT_REPORT.md / README for the docker command and
// `prisma migrate dev --config=prisma.postgres.config.ts`. Not part of the
// default `npm test` since it depends on that external, manually-started
// container rather than being fully self-contained.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    env: {
      DATABASE_URL: "postgresql://agrilease:agrilease_test_pw@localhost:5433/agrilease?schema=public",
      DATABASE_PROVIDER: "postgresql",
      JWT_SECRET: "test-only-secret-3f9a7c2b6e1d4058b9a2c7f1e6d3a8b4",
    },
  },
});
