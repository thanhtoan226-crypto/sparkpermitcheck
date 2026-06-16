-- AlterTable
ALTER TABLE "Shift" ADD COLUMN "endedAt" TEXT;
ALTER TABLE "Shift" ADD COLUMN "startedAt" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Permit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "permitHolderId" TEXT NOT NULL,
    "closedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Permit_permitHolderId_fkey" FOREIGN KEY ("permitHolderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Permit" ("closedAt", "createdAt", "id", "permitHolderId", "status", "title", "type") SELECT "closedAt", "createdAt", "id", "permitHolderId", "status", "title", "type" FROM "Permit";
DROP TABLE "Permit";
ALTER TABLE "new_Permit" RENAME TO "Permit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
