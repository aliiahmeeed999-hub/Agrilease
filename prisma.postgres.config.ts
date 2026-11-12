import "dotenv/config";
import { defineConfig } from "prisma/config";

// Mirrors prisma.config.ts, but points at the generated Postgres schema and
// its own separate migration history (Postgres and SQLite DDL syntax differ,
// so migrations generated against one cannot be replayed against the other).
export default defineConfig({
  schema: "prisma/schema.postgres.prisma",
  migrations: {
    path: "prisma/migrations-postgres",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
