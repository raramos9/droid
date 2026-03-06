/**
 * @jest-environment node
 */
import { GET } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockSearchRepos = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    search: { repos: mockSearchRepos },
  })),
}))

const { auth } = require("@/auth")

function makeGet(search = "") {
  return new NextRequest(`http://localhost/api/github/repos${search}`)
}

beforeEach(() => jest.clearAllMocks())

describe("GET /api/github/repos", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
  })

  it("searches repos and returns items", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" }, accessToken: "tok" })
    const items = [{ full_name: "acme/api", owner: { login: "acme" }, name: "api" }]
    mockSearchRepos.mockResolvedValue({ data: { items } })

    const res = await GET(makeGet("?q=api"))
    const body = await res.json()

    expect(mockSearchRepos).toHaveBeenCalledWith(
      expect.objectContaining({ q: expect.stringContaining("api") })
    )
    expect(res.status).toBe(200)
    expect(body).toEqual(items)
  })

  it("returns 500 on GitHub error", async () => {
    auth.mockResolvedValue({ user: { name: "testuser" }, accessToken: "tok" })
    mockSearchRepos.mockRejectedValue(new Error("API error"))

    const res = await GET(makeGet("?q=api"))
    expect(res.status).toBe(500)
  })
})
