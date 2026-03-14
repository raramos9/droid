/**
 * @jest-environment node
 */
import { GET } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockListFiles = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: { listFiles: mockListFiles },
  })),
}))

const { auth } = require("@/auth")

function makeGet(search = "") {
  return new NextRequest(`http://localhost/api/github/prs/42/files${search}`)
}

function makeParams(number: string) {
  return Promise.resolve({ number })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/github/prs/[number]/files", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })
    expect(res.status).toBe(401)
  })

  it("returns 400 when owner is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await GET(makeGet("?repo=api"), { params: makeParams("42") })
    expect(res.status).toBe(400)
  })

  it("returns 400 when number is not a valid integer", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("abc") })
    expect(res.status).toBe(400)
  })

  it("returns files from octokit", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const files = [
      { filename: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "+foo\n-bar" },
    ]
    mockListFiles.mockResolvedValue({ data: files })

    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(files)
  })

  it("calls octokit with correct params", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListFiles.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })

    expect(mockListFiles).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      pull_number: 42,
    })
  })

  it("returns 500 on GitHub error", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListFiles.mockRejectedValue(new Error("API error"))

    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })
    expect(res.status).toBe(500)
  })
})
