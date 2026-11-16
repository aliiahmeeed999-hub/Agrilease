import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

// PostgreSQL through Prisma's node-postgres driver adapter. DATABASE_URL is a
// postgresql:// connection string (see .env.example).
function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL database.");
  }
  return new PrismaClient({ adapter: new PrismaPg(url) });
}

// One client per process; reused across hot reloads in development so they
// don't each open a new connection pool.
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
