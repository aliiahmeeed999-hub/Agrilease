-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'RENTAL_OWNER', 'BANKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('SUPER_ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'FR', 'AR');

-- CreateEnum
CREATE TYPE "CropType" AS ENUM ('WHEAT', 'BARLEY', 'OLIVES', 'CITRUS', 'VEGETABLES', 'OTHER');

-- CreateEnum
CREATE TYPE "IrrigationType" AS ENUM ('DRIP', 'SPRINKLER', 'FLOOD', 'RAINFED', 'NONE');

-- CreateEnum
CREATE TYPE "WaterSource" AS ENUM ('WELL', 'RIVER', 'RESERVOIR', 'MUNICIPAL', 'RAINWATER');

-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('CLAY', 'SANDY', 'LOAM', 'SILT', 'CHALKY', 'PEAT');

-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('GROWING', 'HARVESTED', 'FALLOW');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('TRACTOR', 'HARVESTER', 'SPRAYER', 'PLOW', 'TRAILER', 'IRRIGATION_PUMP');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'IDLE', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('HYDRAULIC_PRESSURE_DROP', 'SERVICE_COMPLETED', 'GPS_SIGNAL_UNSTABLE', 'LOW_FUEL', 'MAINTENANCE_DUE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('TRACTOR', 'COMBINE_HARVESTER', 'TILLAGE', 'SEEDING_PLANTING', 'SPRAYER', 'IRRIGATION', 'TRANSPORT_TRAILER', 'HARVESTING_OTHER', 'UTILITY_VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('RENT', 'SALE', 'RENT_AND_SALE');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "FinancingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL_FARMER', 'COOPERATIVE', 'GIE', 'AGRICULTURAL_COMPANY', 'ENTERPRISE', 'COLLECTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "FarmActivityType" AS ENUM ('CEREALS', 'MARKET_GARDENING', 'ARBORICULTURE', 'CITRUS', 'OLIVE', 'LIVESTOCK', 'VITICULTURE', 'FORAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('USER_ROLE_CHANGED', 'USER_VERIFIED', 'USER_UNVERIFIED', 'USER_SUSPENDED', 'USER_UNSUSPENDED', 'LISTING_FLAGGED', 'LISTING_UNFLAGGED', 'LISTING_REMOVED', 'LISTING_MODERATION_FLAG_SET');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EQUIPMENT_AVAILABLE', 'RAIN_EXPECTED', 'HARVEST_REMINDER', 'RENTAL_APPROVED', 'MAINTENANCE_DUE', 'TASK_DUE_SOON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FARMER',
    "phone" TEXT,
    "region" TEXT,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" "Locale" NOT NULL DEFAULT 'FR',
    "avatarUrl" TEXT,
    "cin" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "adminLevel" "AdminLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "province" TEXT,
    "sizeHectares" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION,
    "irrigationType" "IrrigationType",
    "waterSource" "WaterSource",
    "soilType" "SoilType",
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cropType" "CropType" NOT NULL,
    "areaHectares" DOUBLE PRECISION NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "polygon" JSONB NOT NULL,
    "status" "FieldStatus" NOT NULL DEFAULT 'GROWING',
    "soilType" "SoilType",
    "irrigationMethod" "IrrigationType",
    "plantedAt" TIMESTAMP(3),
    "expectedHarvestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phone" TEXT,
    "isOnDuty" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "currentFarmId" TEXT,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "enginePowerHp" INTEGER NOT NULL,
    "hitchCapacityKg" INTEGER NOT NULL,
    "maxSpeedKmh" DOUBLE PRECISION NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'IDLE',
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "purchaseYear" INTEGER,
    "dailyRateMad" DOUBLE PRECISION,
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "category" "EquipmentCategory" NOT NULL DEFAULT 'OTHER',
    "listingType" "ListingType" NOT NULL DEFAULT 'RENT',
    "condition" "Condition" NOT NULL DEFAULT 'USED',
    "salePrice" DOUBLE PRECISION,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "yearOfManufacture" INTEGER,
    "hoursUsed" DOUBLE PRECISION,
    "conditionNotes" TEXT,
    "conditionPhotos" JSONB,
    "warrantyMonths" INTEGER,
    "dealerCertified" BOOLEAN NOT NULL DEFAULT false,
    "requiresModeration" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT,
    "farmId" TEXT NOT NULL,
    "fieldId" TEXT,
    "workerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "distanceKm" DOUBLE PRECISION DEFAULT 0,
    "durationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAlert" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentTrackPoint" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentTrackPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentPerformanceSample" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "runningHours" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "tasksCompleted" INTEGER NOT NULL,
    "efficiencyScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentPerformanceSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL DEFAULT 'RENT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "dailyRateMad" DOUBLE PRECISION,
    "totalPriceMad" DOUBLE PRECISION NOT NULL,
    "offeredPriceMad" DOUBLE PRECISION,
    "financingRequested" BOOLEAN NOT NULL DEFAULT false,
    "depositMad" DOUBLE PRECISION,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "pickupLocation" TEXT,
    "returnLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancingRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "farmerId" TEXT NOT NULL,
    "bankerId" TEXT,
    "requestedAmountMad" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "documentUrls" JSONB,
    "status" "FinancingStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "clientType" "ClientType",
    "applicantName" TEXT,
    "applicantIdNumber" TEXT,
    "applicantPhone" TEXT,
    "applicantEmail" TEXT,
    "region" TEXT,
    "province" TEXT,
    "commune" TEXT,
    "farmSizeHectares" DOUBLE PRECISION,
    "irrigatedAreaHectares" DOUBLE PRECISION,
    "rainfedAreaHectares" DOUBLE PRECISION,
    "farmCount" INTEGER,
    "employeeCount" INTEGER,
    "activityTypes" JSONB,
    "hasPriorFinancing" BOOLEAN,
    "subsidyRequested" BOOLEAN,
    "equipmentLines" JSONB,
    "primaryEquipmentCategory" "EquipmentCategory",
    "downPaymentMad" DOUBLE PRECISION,
    "termMonths" INTEGER,
    "monthlyPaymentMad" DOUBLE PRECISION,
    "chosenOfferId" TEXT,
    "chosenOfferInstitution" TEXT,
    "chosenOfferMode" TEXT,
    "chosenOfferRatePct" DOUBLE PRECISION,
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

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "mechanic" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropCycle" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "cropType" "CropType" NOT NULL,
    "plantedAt" TIMESTAMP(3) NOT NULL,
    "harvestedAt" TIMESTAMP(3),
    "expectedHarvestAt" TIMESTAMP(3),
    "growthStage" TEXT,
    "expectedYieldKg" DOUBLE PRECISION,
    "actualYieldKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "type" "CropType" NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "category" TEXT,
    "growingSeason" TEXT,
    "averageYieldKgPerHa" DOUBLE PRECISION,
    "waterRequirementMm" DOUBLE PRECISION,
    "fertilizerRequirement" TEXT,
    "growthDurationDays" INTEGER,
    "minTempC" DOUBLE PRECISION,
    "maxTempC" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "farmId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "windSpeedKmh" DOUBLE PRECISION,
    "rainfallMm" DOUBLE PRECISION,
    "pressureHpa" DOUBLE PRECISION,
    "rainProbabilityPct" DOUBLE PRECISION,
    "isFrostRisk" BOOLEAN NOT NULL DEFAULT false,
    "isHeatRisk" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'open-meteo',

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("farmId")
);

-- CreateTable
CREATE TABLE "SoilCache" (
    "farmId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "ph" DOUBLE PRECISION,
    "nitrogen" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "organicMatterPct" DOUBLE PRECISION,
    "soilMoisturePct" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'soilgrids',

    CONSTRAINT "SoilCache_pkey" PRIMARY KEY ("farmId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RentalOwnerProfile_userId_key" ON "RentalOwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankerProfile_userId_key" ON "BankerProfile"("userId");

-- CreateIndex
CREATE INDEX "Farm_ownerId_idx" ON "Farm"("ownerId");

-- CreateIndex
CREATE INDEX "Field_farmId_idx" ON "Field"("farmId");

-- CreateIndex
CREATE INDEX "Worker_farmId_idx" ON "Worker"("farmId");

-- CreateIndex
CREATE INDEX "Equipment_ownerId_idx" ON "Equipment"("ownerId");

-- CreateIndex
CREATE INDEX "Equipment_currentFarmId_idx" ON "Equipment"("currentFarmId");

-- CreateIndex
CREATE INDEX "Task_equipmentId_scheduledStart_idx" ON "Task"("equipmentId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Task_farmId_scheduledStart_idx" ON "Task"("farmId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Task_workerId_idx" ON "Task"("workerId");

-- CreateIndex
CREATE INDEX "EquipmentAlert_equipmentId_createdAt_idx" ON "EquipmentAlert"("equipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "EquipmentTrackPoint_equipmentId_recordedAt_idx" ON "EquipmentTrackPoint"("equipmentId", "recordedAt");

-- CreateIndex
CREATE INDEX "EquipmentPerformanceSample_equipmentId_date_idx" ON "EquipmentPerformanceSample"("equipmentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPerformanceSample_equipmentId_date_key" ON "EquipmentPerformanceSample"("equipmentId", "date");

-- CreateIndex
CREATE INDEX "Booking_equipmentId_status_idx" ON "Booking"("equipmentId", "status");

-- CreateIndex
CREATE INDEX "Booking_renterId_idx" ON "Booking"("renterId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_authorId_key" ON "Review"("bookingId", "authorId");

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
CREATE INDEX "MaintenanceRecord_equipmentId_performedAt_idx" ON "MaintenanceRecord"("equipmentId", "performedAt");

-- CreateIndex
CREATE INDEX "CropCycle_fieldId_plantedAt_idx" ON "CropCycle"("fieldId", "plantedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Crop_type_key" ON "Crop"("type");

-- AddForeignKey
ALTER TABLE "RentalOwnerProfile" ADD CONSTRAINT "RentalOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankerProfile" ADD CONSTRAINT "BankerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_currentFarmId_fkey" FOREIGN KEY ("currentFarmId") REFERENCES "Farm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAlert" ADD CONSTRAINT "EquipmentAlert_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentTrackPoint" ADD CONSTRAINT "EquipmentTrackPoint_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPerformanceSample" ADD CONSTRAINT "EquipmentPerformanceSample_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCycle" ADD CONSTRAINT "CropCycle_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherCache" ADD CONSTRAINT "WeatherCache_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoilCache" ADD CONSTRAINT "SoilCache_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
