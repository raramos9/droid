/**
 * Constant-time string comparison using HMAC-SHA256 to prevent timing attacks.
 * A random key is generated per call so an attacker cannot correlate HMAC outputs
 * across invocations, making the comparison safe even when one operand is secret.
 */
export async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const sigA = await crypto.subtle.sign("HMAC", key, encoder.encode(a));
  return crypto.subtle.verify("HMAC", key, sigA, encoder.encode(b));
}
