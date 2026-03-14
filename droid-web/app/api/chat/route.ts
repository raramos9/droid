import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const body = await req.json()
  const { messages, context } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 })
  }

  const systemPrompt = `You are droid, an AI coding assistant. You are discussing ${context?.type ?? "item"} #${context?.number ?? "?"} in ${context?.owner ?? "?"}/${context?.repo ?? "?"}. ${context?.summary ?? ""}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      const errorMsg = errorData?.error?.message ?? "Anthropic API error"
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ""

    return NextResponse.json({ role: "assistant", content: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
