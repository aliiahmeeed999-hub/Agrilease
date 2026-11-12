-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('SUPER_ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('TRACTOR', 'COMBINE_HARVESTER', 'TILLAGE', 'SEEDING_PLANTING', 'SPRAYER', 'IRRIGATION', 'TRANSPORT_TRAILER', 'HARVESTING_OTHER', 'UTILITY_VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('RENT', 'SALE', 'RENT_AND_SALE');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "FinancingStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('USER_ROLE_CHANGED', 'USER_VERIFIED', 'USER_UNVERIFIED', 'USER_SUSPENDED', 'USER_UNSUSPENDED', 'LISTING_FLAGGED', 'LISTING_UNFLAGGED', 'LISTING_REMOVED', 'LISTING_MODERATION_FLAG_SET');

-- Role rename prep: add RENTAL_OWNER to the OLD Role type first (each of these
-- runs as its own auto-committed statement, required because ALTER TYPE ...
-- ADD VALUE cannot be used in the same transaction it was added in on older
-- Postgres), then rename existing EQUIPMENT_OWNER rows before the type swap
-- below drops that value entirely.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RENTAL_OWNER';

-- AlterTable (role rename backfill)
UPDATE "User" SET "role" = 'RENTAL_OWNER' WHERE "role" = 'EQUIPMENT_OWNER';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('FARMER', 'RENTAL_OWNER', 'BANKER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'FARMER';
COMMIT;

-- DropIndex
DROP INDEX "Review_bookingId_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "financingRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offeredPriceMad" DOUBLE PRECISION,
ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'RENT',
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "dailyRateMad" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "category" "EquipmentCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "condition" "Condition" NOT NULL DEFAULT 'USED',
ADD COLUMN     "conditionNotes" TEXT,
ADD COLUMN     "conditionPhotos" JSONB,
ADD COLUMN     "dealerCertified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hoursUsed" DOUBLE PRECISION,
ADD COLUMN     "listingType" "ListingType" NOT NULL DEFAULT 'RENT',
ADD COLUMN     "negotiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresModeration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salePrice" DOUBLE PRECISION,
ADD COLUMN     "warrantyMonths" INTEGER,
ADD COLUMN     "yearOfManufacture" INTEGER;

-- AlterTable (authorId added nullable first, backfilled, then locked NOT NULL -
-- every pre-existing Review predates bidirectional reviews and was always
-- written by the booking's renter, the only reviewer role that existed then)
ALTER TABLE "Review" ADD COLUMN     "authorId" TEXT;
UPDATE "Review" r SET "authorId" = b."renterId" FROM "Booking" b WHERE b."id" = r."bookingId";
ALTER TABLE "Review" ALTER COLUMN "authorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminLevel" "AdminLevel",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "cin" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateTable
CREATE TABLE "RentalOwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'INDIVIDUAL',
    "companyName" TEXT,
    "companyRegNumber" TEXT,
    "companyLogoUrl" TEXT,
    "address" TEXT,
    "iban" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "regionsCovered" JSONB,
    "defaultInterestRateText" TEXT,
    "defaultTermsText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancingRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "bankerId" TEXT,
    "requestedAmountMad" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "documentUrls" JSONB,
    "status" "FinancingStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AdminActionType" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_authorId_key" ON "Review"("bookingId", "authorId");

-- AddForeignKey
ALTER TABLE "RentalOwnerProfile" ADD CONSTRAINT "RentalOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankerProfile" ADD CONSTRAINT "BankerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancingRequest" ADD CONSTRAINT "FinancingRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancingRequest" ADD CONSTRAINT "FinancingRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancingRequest" ADD CONSTRAINT "FinancingRequest_bankerId_fkey" FOREIGN KEY ("bankerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
