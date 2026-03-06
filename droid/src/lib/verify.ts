
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature.startsWith("sha256=")) return false;

  const hexSignature = signature.slice(7);
  const pairs = hexSignature.match(/.{2}/g);
  if (!pairs || pairs.length !== hexSignature.length / 2) return false;

  const signatureBytes = new Uint8Array(pairs.map((b) => parseInt(b, 16)));

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(payload));
}
