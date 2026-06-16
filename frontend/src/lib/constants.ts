import type { PermitType, PermitStatus } from "./types";

export const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  CMW: "Commissioning Minor Works",
  CAP_NON_ISOLATION: "Commissioning Access Permit (Non-Isolation)",
  CAP_ISOLATION: "Commissioning Access Permit (Isolation)",
};

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  draft: "Draft",
  isolation_pending: "Isolation Pending",
  active: "Active",
  shift_open: "Daily Revalidated",
  shift_closed: "Daily Relinquished",
  closed: "Closed",
};

export const MAX_USERS = 12;

export const AVATAR_COLORS = [
  "#209dd7",
  "#753991",
  "#ecad0a",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
];
