-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT,
    "farmId" TEXT NOT NULL,
    "fieldId" TEXT,
    "workerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "scheduledStart" DATETIME NOT NULL,
    "scheduledEnd" DATETIME,
    "distanceKm" REAL DEFAULT 0,
    "durationMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "distanceKm", "durationMinutes", "equipmentId", "farmId", "fieldId", "id", "scheduledEnd", "scheduledStart", "status", "title", "updatedAt", "workerId") SELECT "createdAt", "distanceKm", "durationMinutes", "equipmentId", "farmId", "fieldId", "id", "scheduledEnd", "scheduledStart", "status", "title", "updatedAt", "workerId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_equipmentId_scheduledStart_idx" ON "Task"("equipmentId", "scheduledStart");
CREATE INDEX "Task_farmId_scheduledStart_idx" ON "Task"("farmId", "scheduledStart");
CREATE INDEX "Task_workerId_idx" ON "Task"("workerId");
CREATE TABLE "new_Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phone" TEXT,
    "isOnDuty" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Worker_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Worker" ("createdAt", "farmId", "fullName", "id", "isOnDuty", "phone", "title") SELECT "createdAt", "farmId", "fullName", "id", "isOnDuty", "phone", "title" FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
CREATE INDEX "Worker_farmId_idx" ON "Worker"("farmId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
