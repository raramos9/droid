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
      .then((res) => (res.ok ? res.json() : []))
      .then((comments: Array<{ body: string }>) => {
        setDroidComment(comments.length > 0 ? comments[0].body : "")
      })
      .catch(() => setDroidComment(""))
  }, [run, issue.number, owner, repo])

  const handleDispatch = async () => {
    setDispatchState("loading")
    try {
      await fetch("/api/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, repo, type: "issue", issueNumber: issue.number }),
      })
      setDispatchState("done")
    } catch {
      setDispatchState("idle")
    }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Detail section */}
      <div style={{ padding: "8px 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
            margin: 0,
          }}
        >
          opened by {issue.user.login} on{" "}
          {new Date(issue.created_at).toLocaleDateString()}
        </p>

        {run && <ThinkingToggle messages={run.messages} />}

        {droidComment && (
          <div>
            <p
              style={{
                fontSize: "0.8rem",
                fontStyle: "italic",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                margin: 0,
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
                style={{
                  fontSize: "0.7rem",
                  marginTop: 2,
                  color: "var(--text-secondary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  padding: 0,
                }}
              >
                Show more
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleDispatch}
            disabled={dispatchState !== "idle"}
            className="btn-secondary"
            style={{ padding: "3px 10px", fontSize: "0.75rem" }}
          >
            {dispatchState === "idle" && "Dispatch droid"}
            {dispatchState === "loading" && "Dispatching..."}
            {dispatchState === "done" && "Dispatched"}
          </button>
        </div>

        <InlineChat
          context={{ type: "issue", number: issue.number, owner, repo, summary: issue.title }}
        />
      </div>
    </div>
  )
}
