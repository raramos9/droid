/**
 * @jest-environment node
 */
import { GET, PUT } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/queries", () => ({
  getUserConfig: jest.fn(),
  upsertUserConfig: jest.fn(),
}))

const { auth } = require("@/auth")
const { getUserConfig, upsertUserConfig } = require("@/lib/queries")

const authedSession = { user: { name: "alice", email: "alice@example.com" } }
const noIdentitySession = { user: { name: null, email: null } }

beforeEach(() => {
  jest.clearAllMocks()
})

function makeGet() {
  return new NextRequest("http://localhost/api/config", { method: "GET" })
}

function makePut(body: unknown) {
  return new NextRequest("http://localhost/api/config", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

describe("GET /api/config", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
  })

  it("returns 401 when user identity cannot be determined", async () => {
    auth.mockResolvedValue(noIdentitySession)
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
  })

  it("returns config when found", async () => {
    auth.mockResolvedValue(authedSession)
    const config = { id: 1, user_id: "alice", config_text: "my rules", created_at: "", updated_at: "" }
    getUserConfig.mockResolvedValue(config)

    const res = await GET(makeGet())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(config)
    expect(getUserConfig).toHaveBeenCalledWith("alice")
  })

  it("returns null when no config exists", async () => {
    auth.mockResolvedValue(authedSession)
    getUserConfig.mockResolvedValue(null)

    const res = await GET(makeGet())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toBeNull()
  })

  it("returns 500 on query error", async () => {
    auth.mockResolvedValue(authedSession)
    getUserConfig.mockRejectedValue(new Error("DB error"))

    const res = await GET(makeGet())
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe("DB error")
  })
})

describe("PUT /api/config", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await PUT(makePut({ configText: "rules" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when user identity cannot be determined", async () => {
    auth.mockResolvedValue(noIdentitySession)
    const res = await PUT(makePut({ configText: "rules" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when request body is invalid JSON", async () => {
    auth.mockResolvedValue(authedSession)
    const req = new NextRequest("http://localhost/api/config", {
      method: "PUT",
      body: "not-json",
      headers: { "content-type": "application/json" },
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when configText is missing", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({}))
    expect(res.status).toBe(400)
  })

  it("returns 400 when configText is not a string", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({ configText: 123 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when configText exceeds 50KB", async () => {
    auth.mockResolvedValue(authedSession)
    const res = await PUT(makePut({ configText: "x".repeat(50 * 1024 + 1) }))
    expect(res.status).toBe(400)
  })

  it("upserts config and returns 200", async () => {
    auth.mockResolvedValue(authedSession)
    upsertUserConfig.mockResolvedValue(undefined)

    const res = await PUT(makePut({ configText: "my rules" }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(upsertUserConfig).toHaveBeenCalledWith("alice", "my rules")
  })

  it("returns 500 on upsert error", async () => {
    auth.mockResolvedValue(authedSession)
    upsertUserConfig.mockRejectedValue(new Error("upsert failed"))

    const res = await PUT(makePut({ configText: "rules" }))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe("upsert failed")
  })
})
