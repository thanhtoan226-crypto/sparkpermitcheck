-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL,
    "workerId" TEXT
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "permitHolderId" TEXT NOT NULL,
    "closedAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT '()',
    CONSTRAINT "Permit_permitHolderId_fkey" FOREIGN KEY ("permitHolderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsolationTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    CONSTRAINT "IsolationTask_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsolationPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "signedBy" TEXT,
    "signedAt" TEXT,
    "taskId" TEXT NOT NULL,
    CONSTRAINT "IsolationPoint_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "IsolationTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IsolationPoint_signedBy_fkey" FOREIGN KEY ("signedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "permitHolderSignedOn" BOOLEAN NOT NULL DEFAULT false,
    "permitHolderSignedOff" BOOLEAN NOT NULL DEFAULT false,
    "permitId" TEXT NOT NULL,
    CONSTRAINT "Shift_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftWorker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "signedOnAt" TEXT NOT NULL,
    "signedOffAt" TEXT,
    "shiftId" TEXT NOT NULL,
    CONSTRAINT "ShiftWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftWorker_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
