import type { QRCodeData } from "./types";

export function encodeQR(data: QRCodeData): string {
  return JSON.stringify(data);
}

export function decodeQR(value: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed.permitId && parsed.action && parsed.targetId) {
      return parsed as QRCodeData;
    }
    return null;
  } catch {
    return null;
  }
}
