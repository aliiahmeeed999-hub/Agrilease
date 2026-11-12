-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeatherCache" (
    "farmId" TEXT NOT NULL PRIMARY KEY,
    "fetchedAt" DATETIME NOT NULL,
    "temperatureC" REAL,
    "humidityPct" REAL,
    "windSpeedKmh" REAL,
    "rainfallMm" REAL,
    "pressureHpa" REAL,
    "rainProbabilityPct" REAL,
    "isFrostRisk" BOOLEAN NOT NULL DEFAULT false,
    "isHeatRisk" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'open-meteo',
    CONSTRAINT "WeatherCache_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WeatherCache" ("farmId", "fetchedAt", "humidityPct", "pressureHpa", "rainfallMm", "source", "temperatureC", "windSpeedKmh") SELECT "farmId", "fetchedAt", "humidityPct", "pressureHpa", "rainfallMm", "source", "temperatureC", "windSpeedKmh" FROM "WeatherCache";
DROP TABLE "WeatherCache";
ALTER TABLE "new_WeatherCache" RENAME TO "WeatherCache";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
