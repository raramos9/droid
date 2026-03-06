/**
 * @jest-environment node
 */
import { POST } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

const mockCreateWebhook = jest.fn()
const mockFrom = jest.fn()
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()

jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: { createWebhook: mockCreateWebhook },
  })),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
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
})

describe("POST /api/enroll", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)

    const res = await POST(makeRequest({ owner: "acme", repo: "api" }))

    expect(res.status).toBe(401)
  })

  it("returns 400 when owner or repo missing", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" }, accessToken: "tok" })

    const res = await POST(makeRequest({ owner: "acme" }))

    expect(res.status).toBe(400)
  })

  it("creates webhook and inserts enrolled repo on success", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" }, accessToken: "tok" })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })

    const res = await POST(makeRequest({ owner: "acme", repo: "api" }))
    const body = await res.json()

    expect(mockCreateWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "acme", repo: "api" })
    )
    expect(mockFrom).toHaveBeenCalledWith("enrolled_repos")
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it("returns 500 when Supabase insert fails", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" }, accessToken: "tok" })
    mockCreateWebhook.mockResolvedValue({ data: { id: 99 } })
    mockSingle.mockResolvedValue({ data: null, error: { message: "unique constraint violation" } })

    const res = await POST(makeRequest({ owner: "acme", repo: "api" }))

    expect(res.status).toBe(500)
  })

  it("returns 500 when GitHub webhook creation fails", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" }, accessToken: "tok" })
    mockCreateWebhook.mockRejectedValue(new Error("GitHub API error"))

    const res = await POST(makeRequest({ owner: "acme", repo: "api" }))

    expect(res.status).toBe(500)
  })
})
