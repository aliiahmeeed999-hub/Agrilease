-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dailyRateMad" REAL NOT NULL,
    "totalPriceMad" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Equipment_currentFarmId_fkey" FOREIGN KEY ("currentFarmId") REFERENCES "Farm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Equipment" ("createdAt", "currentFarmId", "currentLat", "currentLng", "enginePowerHp", "hitchCapacityKg", "id", "imageUrl", "manufacturer", "maxSpeedKmh", "model", "name", "ownerId", "purchaseYear", "status", "type", "updatedAt") SELECT "createdAt", "currentFarmId", "currentLat", "currentLng", "enginePowerHp", "hitchCapacityKg", "id", "imageUrl", "manufacturer", "maxSpeedKmh", "model", "name", "ownerId", "purchaseYear", "status", "type", "updatedAt" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE INDEX "Equipment_ownerId_idx" ON "Equipment"("ownerId");
CREATE INDEX "Equipment_currentFarmId_idx" ON "Equipment"("currentFarmId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Booking_equipmentId_status_idx" ON "Booking"("equipmentId", "status");

-- CreateIndex
CREATE INDEX "Booking_renterId_idx" ON "Booking"("renterId");
