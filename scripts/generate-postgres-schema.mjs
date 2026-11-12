// Derives prisma/schema.postgres.prisma from prisma/schema.prisma so there is
// exactly one authored, hand-maintained schema (the SQLite one, since that's
// the local dev default) and no risk of the two drifting out of sync. This
// script is the only thing that should ever write schema.postgres.prisma -
// re-run it (via `npm run db:postgres:schema`) any time schema.prisma changes,
// then re-run the postgres migration (see README/PROJECT_REPORT.md) to keep
// prisma/migrations-postgres caught up.
//
// SQLite and Postgres are different SQL dialects, so a single generated Prisma
// Client can't target both at once - Prisma bakes the "provider" into the
// client at `generate` time (confirmed by inspecting the generated client's
// `activeProvider` field). Two schemas -> two generated clients is the
// supported way to offer both, not a workaround.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = path.join(root, "prisma", "schema.prisma");
const targetPath = path.join(root, "prisma", "schema.postgres.prisma");

const source = readFileSync(sourcePath, "utf8");

const header = `// GENERATED FILE - do not edit directly.\n// Produced from prisma/schema.prisma by scripts/generate-postgres-schema.mjs.\n// Edit schema.prisma and re-run \`npm run db:postgres:schema\` instead.\n\n`;

const converted = source
  .replace(/datasource\s+db\s*\{\s*provider\s*=\s*"sqlite"/, (match) => match.replace('"sqlite"', '"postgresql"'))
  .replace(/output\s*=\s*"\.\.\/src\/generated\/prisma"/, 'output   = "../src/generated/prisma-postgres"');

if (!converted.includes('provider = "postgresql"')) {
  throw new Error("Failed to rewrite datasource provider to postgresql - check schema.prisma's datasource block format.");
}
if (!converted.includes('"../src/generated/prisma-postgres"')) {
  throw new Error("Failed to rewrite generator output path - check schema.prisma's generator block format.");
}

writeFileSync(targetPath, header + converted);
console.log(`Wrote ${path.relative(root, targetPath)}`);
