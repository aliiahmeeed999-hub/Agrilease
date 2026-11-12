-- AlterTable
ALTER TABLE "WeatherCache" ADD COLUMN     "isFrostRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHeatRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rainProbabilityPct" DOUBLE PRECISION;
