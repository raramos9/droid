/**
 * @jest-environment node
 */
import { GET } from "./route"
import { NextRequest } from "next/server"
import { fetch, Request, Response, Headers } from "undici"
Object.assign(global, { fetch, Request, Response, Headers })

jest.mock("@/auth", () => ({ auth: jest.fn() }))

const mockListComments = jest.fn()
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: { listComments: mockListComments },
  })),
}))

const { auth } = require("@/auth")

function makeGet(search = "") {
  return new NextRequest(`http://localhost/api/github/issues/42/comments${search}`)
}

function makeParams(number: string) {
  return Promise.resolve({ number })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/github/issues/[number]/comments", () => {
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

  it("filters comments to only droid bot comments", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListComments.mockResolvedValue({
      data: [
        { id: 1, body: "Human comment", user: { login: "testuser" } },
        { id: 2, body: "Droid comment", user: { login: "getdroid[bot]" } },
        { id: 3, body: "Another human", user: { login: "other" } },
      ],
    })

    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].body).toBe("Droid comment")
  })

  it("returns empty array when no droid comments", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListComments.mockResolvedValue({
      data: [
        { id: 1, body: "Human comment", user: { login: "testuser" } },
      ],
    })

    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })
    const body = await res.json()

    expect(body).toHaveLength(0)
  })

  it("calls octokit with correct params", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListComments.mockResolvedValue({ data: [] })

    await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })

    expect(mockListComments).toHaveBeenCalledWith({
      owner: "acme",
      repo: "api",
      issue_number: 42,
    })
  })

  it("returns 500 on GitHub error", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    mockListComments.mockRejectedValue(new Error("API error"))

    const res = await GET(makeGet("?owner=acme&repo=api"), { params: makeParams("42") })
    expect(res.status).toBe(500)
  })
})
