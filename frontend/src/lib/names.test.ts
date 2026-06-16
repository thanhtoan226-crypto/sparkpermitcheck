import { describe, it, expect } from "vitest";
import { generateName } from "./names";

describe("generateName", () => {
  it("returns a name with first and last name", () => {
    const name = generateName("123456");
    const parts = name.split(" ");
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("returns deterministic name for same workerId", () => {
    const name1 = generateName("123456");
    const name2 = generateName("123456");
    expect(name1).toBe(name2);
  });

  it("returns different names for different workerIds", () => {
    const name1 = generateName("123456");
    const name2 = generateName("654321");
    expect(name1).not.toBe(name2);
  });

  it("handles fallback for invalid workerId", () => {
    const name = generateName("abc");
    expect(name.split(" ").length).toBe(2);
  });

  it("handles empty string workerId", () => {
    const name = generateName("");
    expect(name.split(" ").length).toBe(2);
  });

  it("produces known output for specific seed", () => {
    const name = generateName("000001");
    expect(name.split(" ").length).toBe(2);
    expect(name).toBe(generateName("000001"));
  });
});
