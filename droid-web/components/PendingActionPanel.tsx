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
      className="card space-y-3 p-4"
      style={{
        borderLeft: "3px solid var(--status-warning)",
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
            background: "var(--status-warning)",
            display: "inline-block",
            animation: "pulse-subtle 1.5s ease-in-out infinite",
          }}
        />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
        >
          Awaiting Approval
        </span>
      </div>

      <div>
        <span
          className="font-mono text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {action.tool}
        </span>
        <pre
          className="mt-2 p-3 text-xs overflow-x-auto font-mono"
          style={{
            background: "var(--surface-raised)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {JSON.stringify(action.args, null, 2)}
        </pre>
      </div>

      {error && (
        <p role="alert" className="text-xs" style={{ color: "var(--status-error)", fontFamily: "var(--font-sans)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleDecision("approved")}
          disabled={done || loading}
          className="btn-success text-xs px-4 py-1.5"
        >
          {loading ? "..." : "Approve"}
        </button>
        <button
          onClick={() => handleDecision("rejected")}
          disabled={done || loading}
          className="btn-danger-outline text-xs px-4 py-1.5"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
