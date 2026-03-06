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
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
      <div>
        <span className="font-semibold text-sm text-yellow-800">{action.tool}</span>
        <pre className="mt-1 rounded bg-white border border-yellow-100 p-2 text-xs text-zinc-700 overflow-x-auto">
          {JSON.stringify(action.args, null, 2)}
        </pre>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handleDecision("approved")}
          disabled={done || loading}
          className="rounded px-3 py-1.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve
        </button>
        <button
          onClick={() => handleDecision("rejected")}
          disabled={done || loading}
          className="rounded px-3 py-1.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
