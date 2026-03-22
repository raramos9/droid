/**
 * @jest-environment node
 */
import { POST } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

const mockCreateWebhook = jest.fn()
const mockGetRepo = jest.fn()
const mockFrom = jest.fn()
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()
const mockUpsertUserToken = jest.fn()

jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: { createWebhook: mockCreateWebhook, get: mockGetRepo },
  })),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

jest.mock("@/lib/tokenStore", () => ({
  upsertUserToken: (...args: unknown[]) => mockUpsertUserToken(...args),
}))

const { auth } = require("@/auth")

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/enroll", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFrom.mockReturnValue({ insert: mockInsert })
  mockInsert.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({ data: { id: 1 }, error: null })
  mockUpsertUserToken.mockResolvedValue(undefined)
})

describe("POST /api/enroll", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)

    const res = await POST(makeRequest({ owner: "acme", repo: "api" }))

    expect(res.status).toBe(401)
  })

  it("returns 400 when owner or repo missing", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })

    const res = await POST(makeRequest({ owner: "acme" }))

    expect(res.status).toBe(400)
  })

  it("returns 403 when user does not own the repo and is not admin", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "other" }, permissions: { admin: false } } })

    const res = await POST(makeRequest({ owner: "other", repo: "repo" }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/permission/i)
    expect(mockCreateWebhook).not.toHaveBeenCalled()
  })

  it("returns 403 for collaborator repo without admin", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "other" }, permissions: { admin: false } } })

    const res = await POST(makeRequest({ owner: "other", repo: "collab-repo" }))

    expect(res.status).toBe(403)
    expect(mockCreateWebhook).not.toHaveBeenCalled()
  })

  it("creates webhook and inserts enrolled repo for owned repo", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "testuser" }, permissions: { admin: false } } })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })

    const res = await POST(makeRequest({ owner: "testuser", repo: "my-repo" }))
    const body = await res.json()

    expect(mockCreateWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "testuser", repo: "my-repo" })
    )
    expect(mockFrom).toHaveBeenCalledWith("enrolled_repos")
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it("creates webhook for org repo where user has admin permissions", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "myorg" }, permissions: { admin: true } } })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })

    const res = await POST(makeRequest({ owner: "myorg", repo: "repo" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it("returns 500 when Supabase insert fails", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "testuser" }, permissions: { admin: false } } })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })
    mockSingle.mockResolvedValue({ data: null, error: { message: "unique constraint violation" } })

    const res = await POST(makeRequest({ owner: "testuser", repo: "my-repo" }))

    expect(res.status).toBe(500)
  })

  it("returns 500 when GitHub webhook creation fails", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "testuser" }, permissions: { admin: false } } })
    mockCreateWebhook.mockRejectedValue(new Error("GitHub API error"))

    const res = await POST(makeRequest({ owner: "testuser", repo: "my-repo" }))

    expect(res.status).toBe(500)
  })

  it("stores installed_by using session.login not display name", async () => {
    auth.mockResolvedValue({ login: "testuser", user: { name: "Test User" }, accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "testuser" }, permissions: { admin: false } } })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })

    await POST(makeRequest({ owner: "testuser", repo: "my-repo" }))

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ installed_by: "testuser" }),
    )
  })

  it("calls upsertUserToken with login and accessToken on successful enroll", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "ghp_tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "testuser" }, permissions: { admin: false } } })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })

    await POST(makeRequest({ owner: "testuser", repo: "my-repo" }))

    expect(mockUpsertUserToken).toHaveBeenCalledWith("testuser", "ghp_tok")
  })

  it("still returns 200 when upsertUserToken fails on enroll", async () => {
    auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
    mockGetRepo.mockResolvedValue({ data: { owner: { login: "testuser" }, permissions: { admin: false } } })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })
    mockUpsertUserToken.mockRejectedValue(new Error("encryption failed"))

    const res = await POST(makeRequest({ owner: "testuser", repo: "my-repo" }))

    expect(res.status).toBe(200)
  })
})
