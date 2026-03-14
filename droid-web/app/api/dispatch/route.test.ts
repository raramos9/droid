/**
 * @jest-environment node
 */
import { POST } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const { auth } = require("@/auth")

const originalEnv = process.env

beforeEach(() => {
  jest.clearAllMocks()
  process.env = {
    ...originalEnv,
    DROID_WORKER_URL: "http://localhost:8787",
    DROID_RESUME_API_KEY: "test-key",
  }
  jest.spyOn(global, "fetch" as never).mockResolvedValue(
    new Response(JSON.stringify({ message: "Droid dispatched" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }) as never
  )
})

afterAll(() => {
  process.env = originalEnv
})

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/dispatch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

describe("POST /api/dispatch", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await POST(makePost({ owner: "acme", repo: "api", type: "issue", issueNumber: 1 }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when owner is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ repo: "api", type: "issue", issueNumber: 1 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when repo is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ owner: "acme", type: "issue", issueNumber: 1 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when type is invalid", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ owner: "acme", repo: "api", type: "push" }))
    expect(res.status).toBe(400)
  })

  it("proxies to worker and returns response", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const body = { owner: "acme", repo: "api", type: "issue", issueNumber: 1 }

    const res = await POST(makePost(body))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe("Droid dispatched")
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8787/dispatch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    )
  })

  it("returns 500 when worker fetch fails", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    jest.spyOn(global, "fetch" as never).mockRejectedValue(new Error("Network error") as never)

    const res = await POST(makePost({ owner: "acme", repo: "api", type: "issue", issueNumber: 1 }))
    expect(res.status).toBe(500)
  })

  it("forwards worker error status", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    jest.spyOn(global, "fetch" as never).mockResolvedValue(
      new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }) as never
    )

    const res = await POST(makePost({ owner: "acme", repo: "api", type: "issue", issueNumber: 1 }))
    expect(res.status).toBe(400)
  })
})
