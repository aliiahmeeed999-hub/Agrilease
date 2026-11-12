-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "performedAt" DATETIME NOT NULL,
    "nextDueAt" DATETIME,
    "cost" REAL,
    "mechanic" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CropCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "plantedAt" DATETIME NOT NULL,
    "harvestedAt" DATETIME,
    "expectedHarvestAt" DATETIME,
    "growthStage" TEXT,
    "expectedYieldKg" REAL,
    "actualYieldKg" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CropCycle_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "category" TEXT,
    "growingSeason" TEXT,
    "averageYieldKgPerHa" REAL,
    "waterRequirementMm" REAL,
    "fertilizerRequirement" TEXT,
    "growthDurationDays" INTEGER,
    "minTempC" REAL,
    "maxTempC" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "farmId" TEXT NOT NULL PRIMARY KEY,
    "fetchedAt" DATETIME NOT NULL,
    "temperatureC" REAL,
    "humidityPct" REAL,
    "windSpeedKmh" REAL,
    "rainfallMm" REAL,
    "pressureHpa" REAL,
    "source" TEXT NOT NULL DEFAULT 'open-meteo',
    CONSTRAINT "WeatherCache_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SoilCache" (
    "farmId" TEXT NOT NULL PRIMARY KEY,
    "fetchedAt" DATETIME NOT NULL,
    "ph" REAL,
    "nitrogen" REAL,
    "phosphorus" REAL,
    "potassium" REAL,
    "organicMatterPct" REAL,
    "soilMoisturePct" REAL,
    "source" TEXT NOT NULL DEFAULT 'soilgrids',
    CONSTRAINT "SoilCache_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dailyRateMad" REAL NOT NULL,
    "totalPriceMad" REAL NOT NULL,
    "depositMad" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "pickupLocation" TEXT,
    "returnLocation" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "dailyRateMad", "endDate", "equipmentId", "id", "notes", "renterId", "startDate", "status", "totalPriceMad", "updatedAt") SELECT "createdAt", "dailyRateMad", "endDate", "equipmentId", "id", "notes", "renterId", "startDate", "status", "totalPriceMad", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_equipmentId_status_idx" ON "Booking"("equipmentId", "status");
CREATE INDEX "Booking_renterId_idx" ON "Booking"("renterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_equipmentId_performedAt_idx" ON "MaintenanceRecord"("equipmentId", "performedAt");

-- CreateIndex
CREATE INDEX "CropCycle_fieldId_plantedAt_idx" ON "CropCycle"("fieldId", "plantedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Crop_type_key" ON "Crop"("type");
