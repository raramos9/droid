/**
 * @jest-environment node
 */
import { GET } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockSearchRepos = jest.fn()
const mockListRepos = jest.fn()
const mockGetAuthenticated = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    search: { repos: mockSearchRepos },
    repos: { listForAuthenticatedUser: mockListRepos },
    users: { getAuthenticated: mockGetAuthenticated },
  })),
}))

const { auth } = require("@/auth")

function makeGet(search = "") {
  return new NextRequest(`http://localhost/api/github/repos${search}`)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetAuthenticated.mockResolvedValue({ data: { login: "testuser" } })
})

describe("GET /api/github/repos", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet())
    expect(res.status).toBe(401)
  })

  describe("default listing (no query)", () => {
    it("uses listForAuthenticatedUser when q is empty", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      mockListRepos.mockResolvedValue({ data: [] })

      await GET(makeGet())

      expect(mockListRepos).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "updated", per_page: 100 })
      )
      expect(mockSearchRepos).not.toHaveBeenCalled()
    })

    it("returns owned repos from default listing", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      mockListRepos.mockResolvedValue({
        data: [
          { full_name: "testuser/repo", owner: { login: "testuser" }, name: "repo", permissions: { admin: false }, pushed_at: "2024-01-01T00:00:00Z" },
        ],
      })

      const res = await GET(makeGet())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toHaveLength(1)
    })

    it("filters non-owned non-admin repos from default listing", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      mockListRepos.mockResolvedValue({
        data: [
          { full_name: "testuser/owned", owner: { login: "testuser" }, name: "owned", permissions: { admin: false } },
          { full_name: "other/not-owned", owner: { login: "other" }, name: "not-owned", permissions: { admin: false } },
          { full_name: "org/admin-repo", owner: { login: "org" }, name: "admin-repo", permissions: { admin: true } },
        ],
      })

      const res = await GET(makeGet())
      const body = await res.json()

      expect(body).toHaveLength(2)
      expect(body.map((r: { full_name: string }) => r.full_name)).toEqual(
        expect.arrayContaining(["testuser/owned", "org/admin-repo"])
      )
    })

    it("falls back to getAuthenticated when session.login is missing", async () => {
      auth.mockResolvedValue({ login: undefined, accessToken: "tok" })
      mockGetAuthenticated.mockResolvedValue({ data: { login: "testuser" } })
      mockListRepos.mockResolvedValue({
        data: [
          { full_name: "testuser/repo", owner: { login: "testuser" }, name: "repo", permissions: { admin: false } },
          { full_name: "other/repo", owner: { login: "other" }, name: "repo", permissions: { admin: false } },
        ],
      })

      const res = await GET(makeGet())
      const body = await res.json()

      expect(mockGetAuthenticated).toHaveBeenCalled()
      expect(body).toHaveLength(1)
      expect(body[0].full_name).toBe("testuser/repo")
    })

    it("returns 500 on GitHub error in default listing", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      mockListRepos.mockRejectedValue(new Error("API error"))

      const res = await GET(makeGet())
      expect(res.status).toBe(500)
    })
  })

  describe("search (non-empty query)", () => {
    it("returns only repos owned by the user", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      const items = [
        { full_name: "testuser/my-repo", owner: { login: "testuser" }, name: "my-repo", permissions: { admin: false } },
        { full_name: "other/their-repo", owner: { login: "other" }, name: "their-repo", permissions: { admin: false } },
      ]
      mockSearchRepos.mockResolvedValue({ data: { items } })

      const res = await GET(makeGet("?q=repo"))
      const body = await res.json()

      expect(mockListRepos).not.toHaveBeenCalled()
      expect(res.status).toBe(200)
      expect(body).toHaveLength(1)
      expect(body[0].full_name).toBe("testuser/my-repo")
    })

    it("includes org repos where user has admin permissions", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      const items = [
        { full_name: "myorg/repo", owner: { login: "myorg" }, name: "repo", permissions: { admin: true } },
        { full_name: "other/repo2", owner: { login: "other" }, name: "repo2", permissions: { admin: false } },
      ]
      mockSearchRepos.mockResolvedValue({ data: { items } })

      const res = await GET(makeGet("?q=repo"))
      const body = await res.json()

      expect(body).toHaveLength(1)
      expect(body[0].full_name).toBe("myorg/repo")
    })

    it("returns empty array when no repos match ownership criteria", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      mockSearchRepos.mockResolvedValue({
        data: { items: [{ full_name: "other/repo", owner: { login: "other" }, name: "repo", permissions: { admin: false } }] },
      })

      const res = await GET(makeGet("?q=repo"))
      const body = await res.json()

      expect(body).toHaveLength(0)
    })

    it("returns 500 on GitHub error", async () => {
      auth.mockResolvedValue({ login: "testuser", accessToken: "tok" })
      mockSearchRepos.mockRejectedValue(new Error("API error"))

      const res = await GET(makeGet("?q=api"))
      expect(res.status).toBe(500)
    })
  })
})
