-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "farmerId" TEXT NOT NULL,
    "bankerId" TEXT,
    "requestedAmountMad" REAL NOT NULL,
    "purpose" TEXT,
    "documentUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "clientType" TEXT,
    "applicantName" TEXT,
    "applicantIdNumber" TEXT,
    "applicantPhone" TEXT,
    "applicantEmail" TEXT,
    "region" TEXT,
    "province" TEXT,
    "commune" TEXT,
    "farmSizeHectares" REAL,
    "irrigatedAreaHectares" REAL,
    "rainfedAreaHectares" REAL,
    "farmCount" INTEGER,
    "employeeCount" INTEGER,
    "activityTypes" JSONB,
    "hasPriorFinancing" BOOLEAN,
    "subsidyRequested" BOOLEAN,
    "equipmentLines" JSONB,
    "primaryEquipmentCategory" TEXT,
    "downPaymentMad" REAL,
    "termMonths" INTEGER,
    "monthlyPaymentMad" REAL,
    "chosenOfferId" TEXT,
    "chosenOfferInstitution" TEXT,
    "chosenOfferMode" TEXT,
    "chosenOfferRatePct" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancingRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancingRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancingRequest_bankerId_fkey" FOREIGN KEY ("bankerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancingRequest" ("bankerId", "bookingId", "createdAt", "documentUrls", "farmerId", "id", "purpose", "requestedAmountMad", "reviewNotes", "status", "updatedAt") SELECT "bankerId", "bookingId", "createdAt", "documentUrls", "farmerId", "id", "purpose", "requestedAmountMad", "reviewNotes", "status", "updatedAt" FROM "FinancingRequest";
DROP TABLE "FinancingRequest";
ALTER TABLE "new_FinancingRequest" RENAME TO "FinancingRequest";
CREATE UNIQUE INDEX "FinancingRequest_bookingId_key" ON "FinancingRequest"("bookingId");
CREATE INDEX "FinancingRequest_bankerId_status_idx" ON "FinancingRequest"("bankerId", "status");
CREATE INDEX "FinancingRequest_farmerId_idx" ON "FinancingRequest"("farmerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
