/**
 * @jest-environment node
 */
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

const mockEncryptToken = jest.fn()
const mockFrom = jest.fn()
const mockUpsert = jest.fn()

jest.mock("./crypto", () => ({
  encryptToken: (...args: unknown[]) => mockEncryptToken(...args),
}))

jest.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { upsertUserToken } from "./tokenStore"

const VALID_KEY = "a".repeat(64)

beforeEach(() => {
  jest.clearAllMocks()
  process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY
  mockEncryptToken.mockResolvedValue({ ciphertext: "enc", iv: "iv123" })
  mockFrom.mockReturnValue({ upsert: mockUpsert })
  mockUpsert.mockResolvedValue({ error: null })
})

afterEach(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY
})

describe("upsertUserToken", () => {
  it("encrypts token and upserts to user_tokens table", async () => {
    await upsertUserToken("octocat", "ghp_token123")

    expect(mockEncryptToken).toHaveBeenCalledWith("ghp_token123", VALID_KEY)
    expect(mockFrom).toHaveBeenCalledWith("user_tokens")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        github_login: "octocat",
        encrypted_token: "enc",
        iv: "iv123",
      }),
      expect.objectContaining({ onConflict: "github_login" }),
    )
  })

  it("does not throw when TOKEN_ENCRYPTION_KEY is missing", async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})

    await expect(upsertUserToken("octocat", "ghp_token123")).resolves.not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    expect(mockEncryptToken).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it("propagates Supabase errors", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db error" } })

    await expect(upsertUserToken("octocat", "ghp_token123")).rejects.toThrow("db error")
  })

  it("propagates encryption errors", async () => {
    mockEncryptToken.mockRejectedValue(new Error("bad key"))

    await expect(upsertUserToken("octocat", "ghp_token123")).rejects.toThrow("bad key")
  })
})
