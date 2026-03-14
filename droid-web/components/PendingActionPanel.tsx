"use client"

import { useState } from "react"
import type { PendingAction } from "@/lib/types"

interface Props {
  action: PendingAction
}

export function PendingActionPanel({ action }: Props) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDecision(result: "approved" | "rejected") {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: action.run_id,
          toolUseId: action.tool_use_id,
          result,
        }),
      })
      if (!res.ok) throw new Error("Request failed — please try again")
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="space-y-3 p-4"
      style={{
        background: "var(--surface)",
        borderLeft: "3px solid var(--accent)",
        border: "1px solid var(--border)",
        borderLeftWidth: "3px",
        borderLeftColor: "var(--accent)",
        opacity: done ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--accent)",
            display: "inline-block",
            animation: "pulse-dot 1.5s ease-in-out infinite",
          }}
        />
        <span
          className="font-data text-xs uppercase tracking-widest"
          style={{ color: "var(--text-ter)" }}
        >
          Awaiting Approval
        </span>
      </div>

      <div>
        <span
          className="font-data text-sm"
          style={{ color: "var(--accent)" }}
        >
          {action.tool}
        </span>
        <pre
          className="mt-2 p-3 text-xs overflow-x-auto font-data"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-sec)",
          }}
        >
          {JSON.stringify(action.args, null, 2)}
        </pre>
      </div>

      {error && (
        <p role="alert" className="font-data text-xs" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleDecision("approved")}
          disabled={done || loading}
          className="px-4 py-1.5 text-xs font-data uppercase tracking-wider transition-all"
          style={{
            color: "var(--green)",
            border: "1px solid var(--green)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            if (!done && !loading) {
              e.currentTarget.style.background = "var(--green)"
              e.currentTarget.style.color = "var(--bg)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--green)"
          }}
        >
          {loading ? "..." : "Approve"}
        </button>
        <button
          onClick={() => handleDecision("rejected")}
          disabled={done || loading}
          className="px-4 py-1.5 text-xs font-data uppercase tracking-wider transition-all"
          style={{
            color: "var(--red)",
            border: "1px solid var(--red)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            if (!done && !loading) {
              e.currentTarget.style.background = "var(--red)"
              e.currentTarget.style.color = "var(--bg)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--red)"
          }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
