"use client"

import { useState } from "react"
import type { GitHubIssue, AgentRun } from "@/lib/types"
import { ThinkingToggle } from "./ThinkingToggle"
import { InlineChat } from "./InlineChat"

interface Props {
  issue: GitHubIssue
  run: AgentRun | null
  owner: string
  repo: string
}

export function IssueCard({ issue, run, owner, repo }: Props) {
  const [dispatchState, setDispatchState] = useState<"idle" | "loading" | "done">("idle")

  const handleDispatch = async () => {
    setDispatchState("loading")
    try {
      await fetch("/api/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          type: "issue",
          issueNumber: issue.number,
        }),
      })
      setDispatchState("done")
    } catch {
      setDispatchState("idle")
    }
  }

  return (
    <div
      className="p-4 space-y-3"
      style={{
        background: "var(--surface)",
        borderLeft: run
          ? "3px solid var(--accent)"
          : "1px solid var(--border)",
        borderTop: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-data text-sm" style={{ color: "var(--accent)" }}>
            #{issue.number}
          </span>{" "}
          <span className="text-sm" style={{ color: "var(--text-pri)" }}>
            {issue.title}
          </span>
        </div>
      </div>

      <div className="font-data text-xs" style={{ color: "var(--text-ter)" }}>
        opened by {issue.user.login} on{" "}
        {new Date(issue.created_at).toLocaleDateString()}
      </div>

      {run && (
        <span
          className="font-data text-xs uppercase inline-block px-2 py-0.5"
          style={{
            color: "var(--accent)",
            background: "var(--accent-dim)",
          }}
        >
          DROID RESPONDED
        </span>
      )}

      {run && <ThinkingToggle messages={run.messages} />}

      <div className="flex gap-2">
        <button
          onClick={handleDispatch}
          disabled={dispatchState !== "idle"}
          className="font-data text-xs px-3 py-1"
          style={{
            color: "var(--accent)",
            border: "1px solid var(--accent)",
            background: "transparent",
            opacity: dispatchState !== "idle" ? 0.5 : 1,
          }}
        >
          {dispatchState === "idle" && "Dispatch droid"}
          {dispatchState === "loading" && "Dispatching..."}
          {dispatchState === "done" && "Dispatched"}
        </button>
      </div>

      <InlineChat
        context={{
          type: "issue",
          number: issue.number,
          owner,
          repo,
          summary: issue.title,
        }}
      />
    </div>
  )
}
