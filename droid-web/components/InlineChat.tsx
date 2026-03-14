"use client"

import { useState } from "react"
import type { ChatMessage } from "@/lib/types"

interface Props {
  context: {
    type: "issue" | "pr"
    number: number
    owner: string
    repo: string
    summary: string
  }
}

export function InlineChat({ context }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = { role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, context }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Unknown error")
        return
      }

      setMessages([...updatedMessages, { role: "assistant", content: data.content }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {messages.length === 0 && !loading && (
        <p className="font-data text-xs" style={{ color: "var(--text-ter)" }}>
          $ ask droid anything...
        </p>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          className="text-sm p-2"
          style={{
            background: msg.role === "user" ? "var(--surface-2)" : "var(--surface)",
            borderLeft: msg.role === "assistant" ? "2px solid var(--accent)" : undefined,
            textAlign: msg.role === "user" ? "right" : "left",
            color: "var(--text-pri)",
          }}
        >
          {msg.content}
        </div>
      ))}

      {error && (
        <p className="font-data text-xs" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="$ ask droid..."
          className="flex-1 font-data text-sm p-2 resize-none"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-pri)",
            border: "1px solid var(--border)",
          }}
          rows={1}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="font-data text-xs px-3 py-1"
          style={{
            color: "var(--accent)",
            border: "1px solid var(--accent)",
            background: "transparent",
            opacity: !input.trim() || loading ? 0.5 : 1,
          }}
          aria-label="send"
        >
          Send
        </button>
      </div>
    </div>
  )
}
