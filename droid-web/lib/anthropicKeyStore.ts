import { encryptToken } from "./crypto"
import { supabase } from "./supabase"

function assertValidLogin(login: string): void {
  if (!login || login.trim().length === 0) {
    throw new Error("githubLogin must be a non-empty string")
  }
}

export async function upsertAnthropicKey(githubLogin: string, plainKey: string): Promise<void> {
  assertValidLogin(githubLogin)

  if (!plainKey || plainKey.trim().length === 0) {
    throw new Error("Anthropic API key must not be empty")
  }

  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured")
  }

  const { ciphertext, iv } = await encryptToken(plainKey, encryptionKey)

  const { error } = await supabase
    .from("user_anthropic_keys")
    .upsert(
      { github_login: githubLogin, encrypted_key: ciphertext, iv, updated_at: new Date().toISOString() },
      { onConflict: "github_login" },
    )

  if (error) {
    throw new Error(error.message)
  }
}

export async function getAnthropicKeyExists(githubLogin: string): Promise<boolean> {
  assertValidLogin(githubLogin)

  const { data, error } = await supabase
    .from("user_anthropic_keys")
    .select("github_login")
    .eq("github_login", githubLogin)
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return (data?.length ?? 0) > 0
}

export async function deleteAnthropicKey(githubLogin: string): Promise<void> {
  assertValidLogin(githubLogin)

  const { error } = await supabase
    .from("user_anthropic_keys")
    .delete()
    .eq("github_login", githubLogin)

  if (error) {
    throw new Error(error.message)
  }
}
