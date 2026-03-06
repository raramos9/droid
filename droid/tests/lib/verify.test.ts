import { describe, it, expect } from "vitest";
import { verifySignature } from "../../src/lib/verify";

// Generate a real HMAC-SHA256 signature for testing
async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return "sha256=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("verifySignature", () => {
  it("returns true for valid signature", async () => {
    const payload = '{"action":"push"}';
    const secret = "mysecret";
    const signature = await sign(payload, secret);
    expect(await verifySignature(payload, signature, secret)).toBe(true);
  });

  it("returns false for wrong secret", async () => {
    const payload = '{"action":"push"}';
    const signature = await sign(payload, "correct-secret");
    expect(await verifySignature(payload, signature, "wrong-secret")).toBe(false);
  });

  it("returns false for tampered payload", async () => {
    const secret = "mysecret";
    const signature = await sign('{"action":"push"}', secret);
    expect(await verifySignature('{"action":"pull"}', signature, secret)).toBe(false);
  });

  it("returns false for malformed signature", async () => {
    expect(await verifySignature("payload", "sha256=badvalue", "secret")).toBe(false);
  });

  it("returns false for empty signature", async () => {
    expect(await verifySignature("payload", "", "secret")).toBe(false);
  });

  it("returns false for signature without sha256= prefix", async () => {
    const payload = '{"action":"push"}';
    const secret = "mysecret";
    const validSig = await sign(payload, secret);
    const withoutPrefix = validSig.replace("sha256=", "sha1=");
    expect(await verifySignature(payload, withoutPrefix, secret)).toBe(false);
  });

  it("returns false for empty hex after prefix (null pairs match)", async () => {
    expect(await verifySignature("payload", "sha256=", "secret")).toBe(false);
  });

  it("returns false for odd-length hex signature", async () => {
    expect(await verifySignature("payload", "sha256=abc", "secret")).toBe(false);
  });

  it("returns false for correct-length but wrong signature (constant-time safe)", async () => {
    const payload = '{"action":"push"}';
    const secret = "mysecret";
    const validSig = await sign(payload, secret);
    // flip one hex char so the length is the same but the value differs
    const flipped = validSig.slice(0, -1) + (validSig.endsWith("0") ? "1" : "0");
    expect(await verifySignature(payload, flipped, secret)).toBe(false);
  });
});
