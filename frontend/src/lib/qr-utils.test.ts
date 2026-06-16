import { describe, it, expect } from "vitest";
import { encodeQR, decodeQR } from "./qr-utils";
import type { QRCodeData } from "./types";

describe("encodeQR", () => {
  it("encodes QRCodeData to JSON string", () => {
    const data: QRCodeData = {
      permitId: "permit-1",
      action: "task_signature",
      targetId: "task-1",
    };
    const result = encodeQR(data);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(data);
  });

  it("encodes shift action", () => {
    const data: QRCodeData = {
      permitId: "p1",
      action: "shift",
      targetId: "shift-1",
    };
    const result = encodeQR(data);
    expect(JSON.parse(result)).toEqual(data);
  });
});

describe("decodeQR", () => {
  it("decodes valid QR data", () => {
    const data: QRCodeData = {
      permitId: "permit-1",
      action: "task_signature",
      targetId: "task-1",
    };
    const encoded = JSON.stringify(data);
    const result = decodeQR(encoded);
    expect(result).toEqual(data);
  });

  it("returns null for invalid JSON", () => {
    expect(decodeQR("not json")).toBeNull();
  });

  it("returns null for JSON missing permitId", () => {
    expect(decodeQR(JSON.stringify({ action: "task_signature", targetId: "t1" }))).toBeNull();
  });

  it("returns null for JSON missing action", () => {
    expect(decodeQR(JSON.stringify({ permitId: "p1", targetId: "t1" }))).toBeNull();
  });

  it("returns null for JSON missing targetId", () => {
    expect(decodeQR(JSON.stringify({ permitId: "p1", action: "task_signature" }))).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeQR("")).toBeNull();
  });
});
