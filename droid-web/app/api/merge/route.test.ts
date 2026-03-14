/**
 * @jest-environment node
 */
import { POST } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockMerge = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: { merge: mockMerge },
  })),
}))

const { auth } = require("@/auth")

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/merge", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("POST /api/merge", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await POST(makePost({ owner: "acme", repo: "api", pullNumber: 1 }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when owner is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ repo: "api", pullNumber: 1 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when repo is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ owner: "acme", pullNumber: 1 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when pullNumber is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ owner: "acme", repo: "api" }))
    expect(res.status).toBe(400)
  })

  it("returns ok and sha on successful merge", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockMerge.mockResolvedValue({ data: { sha: "abc123", merged: true } })

    const res = await POST(makePost({ owner: "acme", repo: "api", pullNumber: 1 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, sha: "abc123" })
  })

  it("calls octokit with correct params", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockMerge.mockResolvedValue({ data: { sha: "abc123", merged: true } })

    await POST(makePost({ owner: "acme", repo: "api", pullNumber: 42 }))

    expect(mockMerge).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      pull_number: 42,
    })
  })

  it("returns 409 when PR is not mergeable", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockMerge.mockRejectedValue(new Error("405 Not Allowed - not mergeable"))

    const res = await POST(makePost({ owner: "acme", repo: "api", pullNumber: 1 }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe("PR is not mergeable")
  })

  it("returns 500 on other errors", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockMerge.mockRejectedValue(new Error("Server error"))

    const res = await POST(makePost({ owner: "acme", repo: "api", pullNumber: 1 }))
    expect(res.status).toBe(500)
  })
})
