export type UserRole = "spark_user" | "worker";

export type PermitType = "CMW" | "CAP_NON_ISOLATION" | "CAP_ISOLATION";

export type PermitStatus =
  | "isolation_pending"
  | "active"
  | "daily_revalidated"
  | "daily_relinquished"
  | "closed";

export type ShiftStatus = "revalidation_pending" | "open" | "closed" | string;

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
  isolatedById: string | null;
  isolatedAt: string | null;
  isolatedBy: { id: string; name: string } | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  verifiedBy: { id: string; name: string } | null;
  isolationPoints: IsolationPointData[];
};

export type ShiftIsolationConfirmationData = {
  id: string;
  isolationTaskId: string;
  cycleNumber: number;
  isolatedById: string | null;
  isolatedAt: string | null;
  isolatedBy: { id: string; name: string } | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  verifiedBy: { id: string; name: string } | null;
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
  status: ShiftStatus;
  permitIssuerSignedOn: boolean;
  permitIssuerSignedOff: boolean;
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
  permitAcceptorId: string;
  permitIssuerId?: string;
  closedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  permitHolder: { id: string; name: string; avatarColor: string };
  permitAcceptor: { id: string; name: string; avatarColor: string };
  permitIssuer?: { id: string; name: string; avatarColor: string };
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
  permitIssuerId?: string;
};
