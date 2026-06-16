-- CreateTable
CREATE TABLE "ShiftIsolationConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitId" TEXT NOT NULL,
    "isolationTaskId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "signedBy" TEXT,
    "signedAt" TEXT,
    CONSTRAINT "ShiftIsolationConfirmation_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftIsolationConfirmation_isolationTaskId_fkey" FOREIGN KEY ("isolationTaskId") REFERENCES "IsolationTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftIsolationConfirmation_signedBy_fkey" FOREIGN KEY ("signedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
