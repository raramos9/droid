/**
 * @jest-environment node
 */
import { encryptToken, decryptToken } from "./crypto";

const TEST_HEX_KEY = "a".repeat(64);

describe("encryptToken / decryptToken", () => {
  it("round-trips: decrypt returns original plaintext", async () => {
    const plaintext = "ghp_supersecrettoken";
    const { ciphertext, iv } = await encryptToken(plaintext, TEST_HEX_KEY);
    const result = await decryptToken(ciphertext, iv, TEST_HEX_KEY);
    expect(result).toBe(plaintext);
  });

  it("produces valid base64-encoded ciphertext and iv", async () => {
    const { ciphertext, iv } = await encryptToken("hello", TEST_HEX_KEY);
    expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("IV is unique per call", async () => {
    const { iv: iv1 } = await encryptToken("token", TEST_HEX_KEY);
    const { iv: iv2 } = await encryptToken("token", TEST_HEX_KEY);
    expect(iv1).not.toBe(iv2);
  });

  it("throws when decrypting with wrong key", async () => {
    const { ciphertext, iv } = await encryptToken("token", TEST_HEX_KEY);
    const wrongKey = "b".repeat(64);
    await expect(decryptToken(ciphertext, iv, wrongKey)).rejects.toThrow();
  });

  it("throws when ciphertext is tampered", async () => {
    const { ciphertext, iv } = await encryptToken("token", TEST_HEX_KEY);
    const buf = Buffer.from(ciphertext, "base64");
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64");
    await expect(decryptToken(tampered, iv, TEST_HEX_KEY)).rejects.toThrow();
  });

  it("throws when key is not 64 hex chars", async () => {
    await expect(encryptToken("token", "tooshort")).rejects.toThrow();
  });

  it("throws when key contains non-hex characters", async () => {
    await expect(encryptToken("token", "z".repeat(64))).rejects.toThrow();
  });

  it("throws when IV is tampered", async () => {
    const { ciphertext, iv } = await encryptToken("secret", TEST_HEX_KEY);
    const ivBuf = Buffer.from(iv, "base64");
    ivBuf[0] ^= 0xff;
    const tamperedIv = ivBuf.toString("base64");
    await expect(decryptToken(ciphertext, tamperedIv, TEST_HEX_KEY)).rejects.toThrow();
  });

  it("round-trips empty string", async () => {
    const { ciphertext, iv } = await encryptToken("", TEST_HEX_KEY);
    const result = await decryptToken(ciphertext, iv, TEST_HEX_KEY);
    expect(result).toBe("");
  });
});
