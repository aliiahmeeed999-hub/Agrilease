/*
  Warnings:

  - Added the required column `authorId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "RentalOwnerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "companyName" TEXT,
    "companyRegNumber" TEXT,
    "companyLogoUrl" TEXT,
    "address" TEXT,
    "iban" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RentalOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "regionsCovered" JSONB,
    "defaultInterestRateText" TEXT,
    "defaultTermsText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "bankerId" TEXT,
    "requestedAmountMad" REAL NOT NULL,
    "purpose" TEXT,
    "documentUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancingRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancingRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancingRequest_bankerId_fkey" FOREIGN KEY ("bankerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RENT',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dailyRateMad" REAL,
    "totalPriceMad" REAL NOT NULL,
    "offeredPriceMad" REAL,
    "financingRequested" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Booking" ("createdAt", "dailyRateMad", "depositMad", "endDate", "equipmentId", "id", "notes", "paymentStatus", "pickupLocation", "renterId", "returnLocation", "startDate", "status", "totalPriceMad", "updatedAt") SELECT "createdAt", "dailyRateMad", "depositMad", "endDate", "equipmentId", "id", "notes", "paymentStatus", "pickupLocation", "renterId", "returnLocation", "startDate", "status", "totalPriceMad", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_equipmentId_status_idx" ON "Booking"("equipmentId", "status");
CREATE INDEX "Booking_renterId_idx" ON "Booking"("renterId");
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
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "listingType" TEXT NOT NULL DEFAULT 'RENT',
    "condition" TEXT NOT NULL DEFAULT 'USED',
    "salePrice" REAL,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "yearOfManufacture" INTEGER,
    "hoursUsed" REAL,
    "conditionNotes" TEXT,
    "conditionPhotos" JSONB,
    "warrantyMonths" INTEGER,
    "dealerCertified" BOOLEAN NOT NULL DEFAULT false,
    "requiresModeration" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Equipment_currentFarmId_fkey" FOREIGN KEY ("currentFarmId") REFERENCES "Farm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Equipment" ("createdAt", "currentFarmId", "currentLat", "currentLng", "dailyRateMad", "enginePowerHp", "hitchCapacityKg", "id", "imageUrl", "isFlagged", "isListed", "manufacturer", "maxSpeedKmh", "model", "name", "ownerId", "purchaseYear", "status", "type", "updatedAt") SELECT "createdAt", "currentFarmId", "currentLat", "currentLng", "dailyRateMad", "enginePowerHp", "hitchCapacityKg", "id", "imageUrl", "isFlagged", "isListed", "manufacturer", "maxSpeedKmh", "model", "name", "ownerId", "purchaseYear", "status", "type", "updatedAt" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE INDEX "Equipment_ownerId_idx" ON "Equipment"("ownerId");
CREATE INDEX "Equipment_currentFarmId_idx" ON "Equipment"("currentFarmId");
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- authorId backfill: every pre-existing Review predates the bidirectional-review
-- feature and was always written by the booking's renter (the only reviewer role
-- that existed at the time), so that's the correct historical author.
INSERT INTO "new_Review" ("bookingId", "authorId", "comment", "createdAt", "id", "rating")
SELECT r."bookingId", b."renterId", r."comment", r."createdAt", r."id", r."rating"
FROM "Review" r JOIN "Booking" b ON b."id" = r."bookingId";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_bookingId_authorId_key" ON "Review"("bookingId", "authorId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FARMER',
    "phone" TEXT,
    "region" TEXT,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'FR',
    "avatarUrl" TEXT,
    "cin" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "adminLevel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "fullName", "id", "isSuspended", "passwordHash", "phone", "preferredLanguage", "region", "role", "updatedAt") SELECT "createdAt", "email", "fullName", "id", "isSuspended", "passwordHash", "phone", "preferredLanguage", "region", "role", "updatedAt" FROM "User";
-- Role rename: EQUIPMENT_OWNER -> RENTAL_OWNER (existing rows must not be left
-- pointing at a value the new Role enum no longer recognizes).
UPDATE "new_User" SET "role" = 'RENTAL_OWNER' WHERE "role" = 'EQUIPMENT_OWNER';
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RentalOwnerProfile_userId_key" ON "RentalOwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankerProfile_userId_key" ON "BankerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancingRequest_bookingId_key" ON "FinancingRequest"("bookingId");

-- CreateIndex
CREATE INDEX "FinancingRequest_bankerId_status_idx" ON "FinancingRequest"("bankerId", "status");

-- CreateIndex
CREATE INDEX "FinancingRequest_farmerId_idx" ON "FinancingRequest"("farmerId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_targetType_targetId_idx" ON "ActivityLog"("targetType", "targetId");
