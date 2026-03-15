/**
 * @jest-environment node
 */
import { GET, PUT } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/queries", () => ({
  getEnrolledRepos: jest.fn(),
  getRepoConfigOverrides: jest.fn(),
  updateRepoConfigOverrides: jest.fn(),
}))

const { auth } = require("@/auth")
const { getEnrolledRepos, getRepoConfigOverrides, updateRepoConfigOverrides } = require("@/lib/queries")

const authedSession = { user: { name: "alice", email: "alice@example.com" } }
const noIdentitySession = { user: { name: null, email: null } }
const enrolledRepos = [{ owner: "acme", repo: "api", installed_by: "alice" }]

beforeEach(() => {
  jest.clearAllMocks()
  getEnrolledRepos.mockResolvedValue(enrolledRepos)
})

function makeGet(owner?: string, repo?: string) {
  const url = new URL("http://localhost/api/config/repo")
  if (owner) url.searchParams.set("owner", owner)
  if (repo) url.searchParams.set("repo", repo)
  return new NextRequest(url.toString(), { method: "GET" })
}

function makePut(body: unknown) {
  return new NextRequest("http://localhost/api/config/repo", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

describe("GET /api/config/repo", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet("acme", "api"))
    expect(res.status).toBe(401)
  })

  it("returns 401 when user identity cannot be determined", async () => {
    auth.mockResolvedValue(noIdentitySession)
    const res = await GET(makeGet("acme", "api"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when owner is missing", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await GET(makeGet(undefined, "api"))
    expect(res.status).toBe(400)
  })

  it("returns 400 when repo is missing", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await GET(makeGet("acme", undefined))
    expect(res.status).toBe(400)
  })

  it("returns 403 when repo is not enrolled by the user", async () => {
    auth.mockResolvedValue(authedSession)
    getEnrolledRepos.mockResolvedValue([])

    const res = await GET(makeGet("acme", "api"))
    expect(res.status).toBe(403)
  })

  it("returns overrides when found", async () => {
    auth.mockResolvedValue(authedSession)
    getRepoConfigOverrides.mockResolvedValue("custom rules")

    const res = await GET(makeGet("acme", "api"))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.overrides).toBe("custom rules")
    expect(getRepoConfigOverrides).toHaveBeenCalledWith("acme", "api")
  })

  it("returns null when no overrides exist", async () => {
    auth.mockResolvedValue(authedSession)
    getRepoConfigOverrides.mockResolvedValue(null)

    const res = await GET(makeGet("acme", "api"))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.overrides).toBeNull()
  })

  it("returns 500 on query error", async () => {
    auth.mockResolvedValue(authedSession)
    getRepoConfigOverrides.mockRejectedValue(new Error("DB error"))

    const res = await GET(makeGet("acme", "api"))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe("DB error")
  })
})

describe("PUT /api/config/repo", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: "rules" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when user identity cannot be determined", async () => {
    auth.mockResolvedValue(noIdentitySession)
    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: "rules" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when request body is invalid JSON", async () => {
    auth.mockResolvedValue(authedSession)
    const req = new NextRequest("http://localhost/api/config/repo", {
      method: "PUT",
      body: "not-json",
      headers: { "content-type": "application/json" },
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when owner is missing", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({ repo: "api", overrides: "rules" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when repo is missing", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({ owner: "acme", overrides: "rules" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when overrides is not a string", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: 123 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when overrides exceeds 20KB", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: "x".repeat(20 * 1024 + 1) }))
    expect(res.status).toBe(400)
  })

  it("returns 403 when repo is not enrolled by the user", async () => {
    auth.mockResolvedValue(authedSession)
    getEnrolledRepos.mockResolvedValue([])

    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: "rules" }))
    expect(res.status).toBe(403)
  })

  it("updates overrides and returns 200", async () => {
    auth.mockResolvedValue(authedSession)
    updateRepoConfigOverrides.mockResolvedValue(undefined)

    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: "custom rules" }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(updateRepoConfigOverrides).toHaveBeenCalledWith("acme", "api", "custom rules", "alice")
  })

  it("returns 500 on update error", async () => {
    auth.mockResolvedValue(authedSession)
    updateRepoConfigOverrides.mockRejectedValue(new Error("update failed"))

    const res = await PUT(makePut({ owner: "acme", repo: "api", overrides: "rules" }))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe("update failed")
  })
})
