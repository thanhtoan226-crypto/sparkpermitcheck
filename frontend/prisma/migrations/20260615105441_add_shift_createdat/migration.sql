/*
  Warnings:

  - Added the required column `createdAt` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "permitHolderSignedOn" BOOLEAN NOT NULL DEFAULT false,
    "permitHolderSignedOff" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TEXT,
    "endedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    CONSTRAINT "Shift_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Shift" ("date", "endedAt", "id", "permitHolderSignedOff", "permitHolderSignedOn", "permitId", "startedAt", "status", "createdAt") SELECT "date", "endedAt", "id", "permitHolderSignedOff", "permitHolderSignedOn", "permitId", "startedAt", "status", COALESCE("startedAt", datetime('now')) FROM "Shift";
DROP TABLE "Shift";
ALTER TABLE "new_Shift" RENAME TO "Shift";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
