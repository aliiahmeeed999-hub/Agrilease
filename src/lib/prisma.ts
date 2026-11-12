import { PrismaClient as SqlitePrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient as PostgresPrismaClient } from "@/generated/prisma-postgres/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: SqlitePrismaClient | undefined;
}

// DATABASE_PROVIDER selects "sqlite" (default, local dev) or "postgresql" - see
// prisma/schema.postgres.prisma and scripts/generate-postgres-schema.mjs for how
// the Postgres variant is generated. The two generated clients are structurally
// equivalent (same models/fields; the one real behavioral difference is enum
// storage - SQLite keeps enums as plain TEXT, Postgres uses a native
// `CREATE TYPE ... AS ENUM`, confirmed by diffing the two engines' migration
// SQL) but are nominally distinct TypeScript types since each is its own
// generator output, hence the cast below rather than threading a union type
// through every call site in the app.
function createPrismaClient(): SqlitePrismaClient {
  const provider = process.env.DATABASE_PROVIDER ?? "sqlite";

  if (provider === "postgresql") {
    const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
    return new PostgresPrismaClient({ adapter }) as unknown as SqlitePrismaClient;
  }

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new SqlitePrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
