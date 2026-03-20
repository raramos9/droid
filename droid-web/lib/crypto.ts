const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

// Note: timingSafeCompare is not included here — the Next.js app has no
// secret-comparison needs today. If that changes, use Node's
// crypto.timingSafeEqual rather than adding a dependency on this module.

function hexToBytes(hex: string): Uint8Array {
  if (hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Encryption key must be a 64-char hex string (32 bytes)");
  }
  return Uint8Array.from({ length: 32 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
}

async function importKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", hexToBytes(hexKey), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plaintext: string, hexKey: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await importKey(hexKey);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ENCODER.encode(plaintext),
  );
  return {
    ciphertext: Buffer.from(ciphertextBuf).toString("base64"),
    iv: Buffer.from(ivBytes).toString("base64"),
  };
}

export async function decryptToken(ciphertext: string, iv: string, hexKey: string): Promise<string> {
  const key = await importKey(hexKey);
  const ciphertextBuf = Buffer.from(ciphertext, "base64");
  const ivBuf = Buffer.from(iv, "base64");
  const plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, ciphertextBuf);
  return DECODER.decode(plaintextBuf);
}
