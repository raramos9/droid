"use client"

import { useState, useEffect } from "react"
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
  const [droidComment, setDroidComment] = useState<string | null>(null)
  const [showFullComment, setShowFullComment] = useState(false)

  useEffect(() => {
    if (!run) return
    fetch(`/api/github/issues/${issue.number}/comments?owner=${owner}&repo=${repo}`)
      .then((res) => res.ok ? res.json() : [])
      .then((comments: Array<{ body: string }>) => {
        if (comments.length > 0) {
          setDroidComment(comments[0].body)
        } else {
          setDroidComment("")
        }
      })
      .catch(() => setDroidComment(""))
  }, [run, issue.number, owner, repo])

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
      className="py-4 space-y-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
            #{issue.number}
          </span>{" "}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
            {issue.title}
          </span>
        </div>
      </div>

      <div className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
        opened by {issue.user.login} on{" "}
        {new Date(issue.created_at).toLocaleDateString()}
      </div>

      {run && (
        <span
          className="badge"
          style={{
            background: "var(--status-success-bg)",
            color: "var(--status-success)",
          }}
        >
          Droid responded
        </span>
      )}

      {run && <ThinkingToggle messages={run.messages} />}

      {droidComment && (
        <div>
          <p
            className="text-sm italic"
            style={{
              color: "var(--text-secondary)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: showFullComment ? undefined : 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {droidComment}
          </p>
          {droidComment.split("\n").length > 3 && !showFullComment && (
            <button
              onClick={() => setShowFullComment(true)}
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              Show more
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleDispatch}
          disabled={dispatchState !== "idle"}
          className="btn-secondary text-xs px-3 py-1"
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
