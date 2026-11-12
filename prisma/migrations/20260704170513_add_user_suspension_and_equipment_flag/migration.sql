-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "currentFarmId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "enginePowerHp" INTEGER NOT NULL,
    "hitchCapacityKg" INTEGER NOT NULL,
    "maxSpeedKmh" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "currentLat" REAL,
    "currentLng" REAL,
    "imageUrl" TEXT,
    "purchaseYear" INTEGER,
    "dailyRateMad" REAL,
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Equipment_currentFarmId_fkey" FOREIGN KEY ("currentFarmId") REFERENCES "Farm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Equipment" ("createdAt", "currentFarmId", "currentLat", "currentLng", "dailyRateMad", "enginePowerHp", "hitchCapacityKg", "id", "imageUrl", "isListed", "manufacturer", "maxSpeedKmh", "model", "name", "ownerId", "purchaseYear", "status", "type", "updatedAt") SELECT "createdAt", "currentFarmId", "currentLat", "currentLng", "dailyRateMad", "enginePowerHp", "hitchCapacityKg", "id", "imageUrl", "isListed", "manufacturer", "maxSpeedKmh", "model", "name", "ownerId", "purchaseYear", "status", "type", "updatedAt" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE INDEX "Equipment_ownerId_idx" ON "Equipment"("ownerId");
CREATE INDEX "Equipment_currentFarmId_idx" ON "Equipment"("currentFarmId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FARMER',
    "phone" TEXT,
    "region" TEXT,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "fullName", "id", "passwordHash", "phone", "region", "role", "updatedAt") SELECT "createdAt", "email", "fullName", "id", "passwordHash", "phone", "region", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
