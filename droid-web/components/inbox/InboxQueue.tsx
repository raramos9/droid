"use client"

import { useState, useEffect, useCallback } from "react"
import type { PendingActionWithContext } from "@/lib/types"
import { InboxItem } from "./InboxItem"

interface Props {
  actions: PendingActionWithContext[]
}

export function InboxQueue({ actions }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea") return

      switch (e.key) {
        case "j":
          setSelectedIndex((prev) => Math.min(prev + 1, actions.length - 1))
          break
        case "k":
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev === 0 ? -1 : -1))
          break
        case "Escape":
          setSelectedIndex(-1)
          break
      }
    },
    [actions.length]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (actions.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          No pending actions — you&rsquo;re all caught up.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Count header */}
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-sans)",
          marginBottom: 12,
        }}
      >
        {actions.length} pending {actions.length === 1 ? "action" : "actions"}
      </p>

      {/* Dense list */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {actions.map((action, i) => (
          <InboxItem
            key={action.id}
            action={action}
            selected={selectedIndex === i}
            onSelect={() => setSelectedIndex(i === selectedIndex ? -1 : i)}
          />
        ))}
      </div>

      <p
        style={{
          fontSize: "0.7rem",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-sans)",
          marginTop: 8,
        }}
      >
        j/k to navigate · Enter to expand · a to approve · r to reject
      </p>
    </div>
  )
}
