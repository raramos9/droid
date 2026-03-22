/**
 * @jest-environment node
 */
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

const mockEncryptToken = jest.fn()
const mockFrom = jest.fn()
const mockUpsert = jest.fn()
const mockSelect = jest.fn()
const mockSelectEq = jest.fn()
const mockSelectLimit = jest.fn()
const mockDelete = jest.fn()
const mockDeleteEq = jest.fn()

jest.mock("./crypto", () => ({
  encryptToken: (...args: unknown[]) => mockEncryptToken(...args),
}))

jest.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { upsertAnthropicKey, getAnthropicKeyExists, deleteAnthropicKey } from "./anthropicKeyStore"

const VALID_KEY = "a".repeat(64)

beforeEach(() => {
  jest.clearAllMocks()
  process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY
  mockEncryptToken.mockResolvedValue({ ciphertext: "enc", iv: "iv123" })
  mockUpsert.mockResolvedValue({ error: null })
  mockSelectLimit.mockResolvedValue({ data: [], error: null })
  mockSelectEq.mockReturnValue({ limit: mockSelectLimit })
  mockSelect.mockReturnValue({ eq: mockSelectEq })
  mockDeleteEq.mockResolvedValue({ error: null })
  mockDelete.mockReturnValue({ eq: mockDeleteEq })
  mockFrom.mockReturnValue({ upsert: mockUpsert, select: mockSelect, delete: mockDelete })
})

afterEach(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY
})

describe("upsertAnthropicKey", () => {
  it("encrypts key and upserts to user_anthropic_keys table", async () => {
    await upsertAnthropicKey("octocat", "sk-ant-test123")

    expect(mockEncryptToken).toHaveBeenCalledWith("sk-ant-test123", VALID_KEY)
    expect(mockFrom).toHaveBeenCalledWith("user_anthropic_keys")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        github_login: "octocat",
        encrypted_key: "enc",
        iv: "iv123",
      }),
      expect.objectContaining({ onConflict: "github_login" }),
    )
  })

  it("never includes plaintext key in the upsert payload", async () => {
    await upsertAnthropicKey("octocat", "sk-ant-test123")

    const payload = mockUpsert.mock.calls[0][0]
    expect(JSON.stringify(payload)).not.toContain("sk-ant-test123")
  })

  it("throws when TOKEN_ENCRYPTION_KEY is missing", async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY

    await expect(upsertAnthropicKey("octocat", "sk-ant-test123")).rejects.toThrow(
      "TOKEN_ENCRYPTION_KEY is not configured",
    )
    expect(mockEncryptToken).not.toHaveBeenCalled()
  })

  it("throws when githubLogin is empty", async () => {
    await expect(upsertAnthropicKey("", "sk-ant-test123")).rejects.toThrow("non-empty")
  })

  it("throws when plainKey is empty", async () => {
    await expect(upsertAnthropicKey("octocat", "")).rejects.toThrow("must not be empty")
  })

  it("propagates Supabase errors", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db error" } })

    await expect(upsertAnthropicKey("octocat", "sk-ant-test123")).rejects.toThrow("db error")
  })

  it("propagates encryption errors", async () => {
    mockEncryptToken.mockRejectedValue(new Error("bad key"))

    await expect(upsertAnthropicKey("octocat", "sk-ant-test123")).rejects.toThrow("bad key")
  })
})

describe("getAnthropicKeyExists", () => {
  it("returns true when a row exists for the login", async () => {
    mockSelectLimit.mockResolvedValue({ data: [{ github_login: "octocat" }], error: null })

    const result = await getAnthropicKeyExists("octocat")

    expect(result).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("user_anthropic_keys")
    expect(mockSelect).toHaveBeenCalledWith("github_login")
    expect(mockSelectEq).toHaveBeenCalledWith("github_login", "octocat")
  })

  it("returns false when no row exists", async () => {
    const result = await getAnthropicKeyExists("octocat")

    expect(result).toBe(false)
  })

  it("throws on Supabase error", async () => {
    mockSelectLimit.mockResolvedValue({ data: null, error: { message: "db error" } })

    await expect(getAnthropicKeyExists("octocat")).rejects.toThrow("db error")
  })

  it("throws when githubLogin is empty", async () => {
    await expect(getAnthropicKeyExists("")).rejects.toThrow("non-empty")
  })
})

describe("deleteAnthropicKey", () => {
  it("deletes the row for the given login", async () => {
    await deleteAnthropicKey("octocat")

    expect(mockFrom).toHaveBeenCalledWith("user_anthropic_keys")
    expect(mockDelete).toHaveBeenCalled()
    expect(mockDeleteEq).toHaveBeenCalledWith("github_login", "octocat")
  })

  it("propagates Supabase errors", async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: "delete failed" } })

    await expect(deleteAnthropicKey("octocat")).rejects.toThrow("delete failed")
  })

  it("throws when githubLogin is empty", async () => {
    await expect(deleteAnthropicKey("")).rejects.toThrow("non-empty")
  })
})
