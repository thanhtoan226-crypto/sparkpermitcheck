import { describe, it, expect } from "vitest";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS, MAX_USERS, AVATAR_COLORS } from "./constants";

describe("PERMIT_TYPE_LABELS", () => {
  it("has labels for all three permit types", () => {
    expect(PERMIT_TYPE_LABELS.CMW).toBe("Commissioning Minor Works");
    expect(PERMIT_TYPE_LABELS.CAP_NON_ISOLATION).toBe("Commissioning Access Permit (Non-Isolation)");
    expect(PERMIT_TYPE_LABELS.CAP_ISOLATION).toBe("Commissioning Access Permit (Isolation)");
  });

  it("has exactly 3 entries", () => {
    expect(Object.keys(PERMIT_TYPE_LABELS)).toHaveLength(3);
  });
});

describe("PERMIT_STATUS_LABELS", () => {
  it("has labels for all six statuses", () => {
    expect(Object.keys(PERMIT_STATUS_LABELS)).toHaveLength(6);
    expect(PERMIT_STATUS_LABELS.draft).toBe("Draft");
    expect(PERMIT_STATUS_LABELS.isolation_pending).toBe("Isolation Pending");
    expect(PERMIT_STATUS_LABELS.active).toBe("Active");
    expect(PERMIT_STATUS_LABELS.shift_open).toBe("Daily Revalidated");
    expect(PERMIT_STATUS_LABELS.shift_closed).toBe("Daily Relinquished");
    expect(PERMIT_STATUS_LABELS.closed).toBe("Closed");
  });
});

describe("MAX_USERS", () => {
  it("is 12", () => {
    expect(MAX_USERS).toBe(12);
  });
});

describe("AVATAR_COLORS", () => {
  it("has 6 colors matching MAX_USERS", () => {
    expect(AVATAR_COLORS).toHaveLength(6);
  });

  it("includes spark palette colors", () => {
    expect(AVATAR_COLORS).toContain("#209dd7");
    expect(AVATAR_COLORS).toContain("#753991");
    expect(AVATAR_COLORS).toContain("#ecad0a");
  });
});
