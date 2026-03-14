"use client"

import { useState } from "react"
import type { Message } from "@/lib/types"

interface Props {
  messages: Message[]
}

export function ThinkingToggle({ messages }: Props) {
  const [expanded, setExpanded] = useState(false)

  const textBlocks = messages.flatMap((msg) => {
    if (typeof msg.content === "string") return []
    return msg.content.filter(
      (block): block is { type: "text"; text: string } => block.type === "text"
    )
  })

  if (textBlocks.length === 0) {
    return null
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs flex items-center gap-2 py-1"
        style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
      >
        <span style={{ color: "var(--text-tertiary)" }}>›</span>
        Show thinking ({textBlocks.length} steps)
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {textBlocks.map((block, i) => (
        <div
          key={`${i}-${block.text.slice(0, 32)}`}
          className="flex gap-2 text-sm"
          style={{
            borderTop: i > 0 ? "1px solid var(--border)" : undefined,
            paddingTop: i > 0 ? "0.5rem" : undefined,
          }}
        >
          <span
            className="font-mono text-xs shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          >
            {i + 1}.
          </span>
          <span
            className="whitespace-pre-wrap text-sm"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}
          >
            {block.text}
          </span>
        </div>
      ))}
      <button
        onClick={() => setExpanded(false)}
        className="text-xs py-1"
        style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
      >
        Hide thinking
      </button>
    </div>
  )
}
