/**
 * @jest-environment node
 */
import { POST } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

const { auth } = require("@/auth")

const mockFetch = jest.fn()
global.fetch = mockFetch

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/resume", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.DROID_WORKER_URL = "http://localhost:8787"
  process.env.RESUME_API_KEY = "test-key"
})

describe("POST /api/resume", () => {
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)

    const res = await POST(makeRequest({ runId: "r1", toolUseId: "t1", result: "ok" }))

    expect(res.status).toBe(401)
  })

  it("returns 400 when required fields are missing", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" } })

    const res = await POST(makeRequest({ runId: "r1" }))

    expect(res.status).toBe(400)
  })

  it("proxies to worker and returns response", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" } })
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const res = await POST(makeRequest({ runId: "r1", toolUseId: "t1", result: "approved" }))
    const body = await res.json()

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8787/resume/r1",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    )
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it("returns 400 when runId contains path traversal characters", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" } })

    const res = await POST(makeRequest({ runId: "../admin", toolUseId: "t1", result: "approved" }))

    expect(res.status).toBe(400)
  })

  it("returns 400 when runId contains slashes", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" } })

    const res = await POST(makeRequest({ runId: "run/evil", toolUseId: "t1", result: "approved" }))

    expect(res.status).toBe(400)
  })

  it("accepts valid uuid-style runId", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" } })
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const res = await POST(makeRequest({ runId: "abc123-def456", toolUseId: "t1", result: "approved" }))

    expect(res.status).toBe(200)
  })

  it("returns 500 when worker request fails", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" } })
    mockFetch.mockRejectedValue(new Error("Network error"))

    const res = await POST(makeRequest({ runId: "r1", toolUseId: "t1", result: "approved" }))

    expect(res.status).toBe(500)
  })
})
