-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'FR', 'AR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" "Locale" NOT NULL DEFAULT 'FR';
