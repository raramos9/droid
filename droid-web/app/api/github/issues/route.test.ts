/**
 * @jest-environment node
 */
import { GET } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockListForRepo = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: { listForRepo: mockListForRepo },
  })),
}))

const { auth } = require("@/auth")

function makeGet(search = "") {
  return new NextRequest(`http://localhost/api/github/issues${search}`)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/github/issues", () => {
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

  it("returns issues with pull_request items filtered out", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListForRepo.mockResolvedValue({
      data: [
        { number: 1, title: "Bug report", pull_request: undefined },
        { number: 2, title: "Feature PR", pull_request: { url: "..." } },
        { number: 3, title: "Another bug" },
      ],
    })

    const res = await GET(makeGet("?owner=acme&repo=api"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body.map((i: { number: number }) => i.number)).toEqual([1, 3])
  })

  it("calls octokit with correct params", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListForRepo.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api"))

    expect(mockListForRepo).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      state: "open",
      per_page: 30,
    })
  })

  it("returns 500 on GitHub error", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListForRepo.mockRejectedValue(new Error("API error"))

    const res = await GET(makeGet("?owner=acme&repo=api"))
    expect(res.status).toBe(500)
  })

  it("passes state=closed to octokit when state param is closed", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListForRepo.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api&state=closed"))

    expect(mockListForRepo).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      state: "closed",
      per_page: 30,
    })
  })

  it("passes state=all to octokit when state param is all", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListForRepo.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api&state=all"))

    expect(mockListForRepo).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      state: "all",
      per_page: 30,
    })
  })

  it("defaults to open when state param is omitted", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListForRepo.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api"))

    expect(mockListForRepo).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      state: "open",
      per_page: 30,
    })
  })

  it("returns 400 when state param is invalid", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })

    const res = await GET(makeGet("?owner=acme&repo=api&state=invalid"))
    expect(res.status).toBe(400)
  })
})
