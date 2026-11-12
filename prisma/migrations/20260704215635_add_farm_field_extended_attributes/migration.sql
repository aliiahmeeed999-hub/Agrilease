-- AlterTable
ALTER TABLE "Farm" ADD COLUMN "elevation" REAL;
ALTER TABLE "Farm" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Farm" ADD COLUMN "irrigationType" TEXT;
ALTER TABLE "Farm" ADD COLUMN "province" TEXT;
ALTER TABLE "Farm" ADD COLUMN "soilType" TEXT;
ALTER TABLE "Farm" ADD COLUMN "waterSource" TEXT;

-- AlterTable
ALTER TABLE "Field" ADD COLUMN "irrigationMethod" TEXT;
ALTER TABLE "Field" ADD COLUMN "soilType" TEXT;
