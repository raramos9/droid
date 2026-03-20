import { describe, it, expect } from "vitest";
import { timingSafeCompare } from "../../src/lib/crypto";

describe("timingSafeCompare", () => {
  it("returns true for identical strings", async () => {
    expect(await timingSafeCompare("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of same length", async () => {
    expect(await timingSafeCompare("abc", "xyz")).toBe(false);
  });

  it("returns false for different-length strings", async () => {
    expect(await timingSafeCompare("abc", "abcd")).toBe(false);
  });

  it("returns false for empty vs non-empty", async () => {
    expect(await timingSafeCompare("", "a")).toBe(false);
    expect(await timingSafeCompare("a", "")).toBe(false);
  });

  it("returns true for empty strings", async () => {
    expect(await timingSafeCompare("", "")).toBe(true);
  });

  it("returns false for prefix match", async () => {
    expect(await timingSafeCompare("secret", "secret-extra")).toBe(false);
  });

  it("handles long strings correctly", async () => {
    const key = "a".repeat(128);
    expect(await timingSafeCompare(key, key)).toBe(true);
    expect(await timingSafeCompare(key, key.slice(0, -1) + "b")).toBe(false);
  });
});
