export type UserRole = "permit_holder" | "worker";

export type PermitType = "CMW" | "CAP_NON_ISOLATION" | "CAP_ISOLATION";

export type PermitStatus =
  | "draft"
  | "isolation_pending"
  | "active"
  | "shift_open"
  | "shift_closed"
  | "closed";

export type ShiftStatus = "revalidation_pending" | "open" | "closed";

export type QRAction = "task_signature" | "shift" | "shift_isolation_confirmation";

export type QRCodeData = {
  permitId: string;
  action: QRAction;
  targetId: string;
};

export type SessionUser = {
  id: string;
  role: string;
  name: string;
  avatarColor: string;
  workerId?: string;
};

export type IsolationPointData = {
  id: string;
  name: string;
  signedBy: string | null;
  signedAt: string | null;
  signer: { id: string; name: string } | null;
};

export type IsolationTaskData = {
  id: string;
  name: string;
  isolationPoints: IsolationPointData[];
};

export type ShiftIsolationConfirmationData = {
  id: string;
  isolationTaskId: string;
  cycleNumber: number;
  signedBy: string | null;
  signedAt: string | null;
  signer: { id: string; name: string } | null;
};

export type ShiftWorkerData = {
  id: string;
  userId: string;
  signedOnAt: string;
  signedOffAt: string | null;
  user: { id: string; name: string; avatarColor: string; workerId?: string };
};

export type ShiftData = {
  id: string;
  date: string;
  status: string;
  permitHolderSignedOn: boolean;
  permitHolderSignedOff: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  workers: ShiftWorkerData[];
};

export type PermitData = {
  id: string;
  type: string;
  title: string;
  status: string;
  permitHolderId: string;
  closedAt: string | null;
  createdAt: string;
  permitHolder: { id: string; name: string; avatarColor: string };
  isolationTasks: IsolationTaskData[];
  shifts: ShiftData[];
  shiftIsolationConfirmations: ShiftIsolationConfirmationData[];
};

export type PermitSummary = {
  id: string;
  type: string;
  title: string;
  status: string;
  permitHolderId: string;
};
