/**
 * @jest-environment node
 */
import { GET } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockList = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: { list: mockList },
  })),
}))

const { auth } = require("@/auth")

function makeGet(search = "") {
  return new NextRequest(`http://localhost/api/github/prs${search}`)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/github/prs", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet("?owner=acme&repo=api"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when owner is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await GET(makeGet("?repo=api"))
    expect(res.status).toBe(400)
  })

  it("returns 400 when repo is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await GET(makeGet("?owner=acme"))
    expect(res.status).toBe(400)
  })

  it("returns PRs from octokit", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const prs = [
      { number: 1, title: "Fix typo", state: "open" },
      { number: 2, title: "Add feature", state: "open" },
    ]
    mockList.mockResolvedValue({ data: prs })

    const res = await GET(makeGet("?owner=acme&repo=api"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(prs)
  })

  it("calls octokit with correct params", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockList.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api"))

    expect(mockList).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      state: "open",
      per_page: 30,
    })
  })

  it("returns 500 on GitHub error", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockList.mockRejectedValue(new Error("API error"))

    const res = await GET(makeGet("?owner=acme&repo=api"))
    expect(res.status).toBe(500)
  })
})
