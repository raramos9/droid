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
    ANTHROPIC_API_KEY: "test-anthropic-key",
  }
  jest.spyOn(global, "fetch" as never).mockResolvedValue(
    new Response(
      JSON.stringify({
        content: [{ type: "text", text: "Here is my analysis." }],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    ) as never
  )
})

afterAll(() => {
  process.env = originalEnv
})

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const validBody = {
  messages: [{ role: "user", content: "What does this issue mean?" }],
  context: {
    type: "issue",
    number: 42,
    owner: "acme",
    repo: "api",
    summary: "Fix login bug",
  },
}

describe("POST /api/chat", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await POST(makePost(validBody))
    expect(res.status).toBe(401)
  })

  it("returns 400 when messages is empty", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ ...validBody, messages: [] }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when messages is not an array", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    const res = await POST(makePost({ ...validBody, messages: "hello" }))
    expect(res.status).toBe(400)
  })

  it("returns assistant message on success", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })

    const res = await POST(makePost(validBody))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ role: "assistant", content: "Here is my analysis." })
  })

  it("calls Anthropic API with correct params", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })

    await POST(makePost(validBody))

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-anthropic-key",
          "anthropic-version": "2023-06-01",
        }),
      })
    )

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(callBody.model).toBe("claude-sonnet-4-6")
    expect(callBody.max_tokens).toBe(1024)
    expect(callBody.system).toContain("issue")
    expect(callBody.system).toContain("#42")
    expect(callBody.system).toContain("acme/api")
  })

  it("returns 500 when ANTHROPIC_API_KEY is missing", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    process.env = { ...originalEnv }
    delete process.env.ANTHROPIC_API_KEY

    const res = await POST(makePost(validBody))
    expect(res.status).toBe(500)
  })

  it("returns 500 when Anthropic fetch fails", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    jest.spyOn(global, "fetch" as never).mockRejectedValue(new Error("Network error") as never)

    const res = await POST(makePost(validBody))
    expect(res.status).toBe(500)
  })

  it("returns 500 when Anthropic returns error status", async () => {
    auth.mockResolvedValue({ accessToken: "tok" })
    jest.spyOn(global, "fetch" as never).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Rate limited" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }) as never
    )

    const res = await POST(makePost(validBody))
    expect(res.status).toBe(500)
  })
})
