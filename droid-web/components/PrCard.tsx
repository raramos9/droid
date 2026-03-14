"use client"

import { useState } from "react"
import type { GitHubPR, GitHubPRFile } from "@/lib/types"
import { FileDiff } from "./FileDiff"
import { InlineChat } from "./InlineChat"

interface Props {
  pr: GitHubPR
  isDroidCreated: boolean
  owner: string
  repo: string
}

export function PrCard({ pr, isDroidCreated, owner, repo }: Props) {
  const [dispatchState, setDispatchState] = useState<"idle" | "loading" | "done">("idle")
  const [mergeState, setMergeState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [showFiles, setShowFiles] = useState(false)
  const [files, setFiles] = useState<GitHubPRFile[] | null>(null)

  const handleDispatch = async () => {
    setDispatchState("loading")
    try {
      await fetch("/api/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          type: "pr",
          prNumber: pr.number,
        }),
      })
      setDispatchState("done")
    } catch {
      setDispatchState("idle")
    }
  }

  const handleMerge = async () => {
    setMergeState("loading")
    setMergeError(null)
    try {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, repo, pullNumber: pr.number }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMergeState("error")
        setMergeError(data.error ?? "Merge failed")
        return
      }
      setMergeState("done")
    } catch {
      setMergeState("error")
      setMergeError("Network error")
    }
  }

  const handleShowFiles = async () => {
    if (showFiles) {
      setShowFiles(false)
      return
    }
    if (files === null) {
      try {
        const res = await fetch(
          `/api/github/prs/${pr.number}/files?owner=${owner}&repo=${repo}`
        )
        const data = await res.json()
        setFiles(data)
      } catch {
        setFiles([])
      }
    }
    setShowFiles(true)
  }

  return (
    <div
      className="py-4 space-y-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
            #{pr.number}
          </span>{" "}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
            {pr.title}
          </span>
        </div>
      </div>

      <div className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
        {pr.head.ref} → {pr.base.ref} on{" "}
        {new Date(pr.created_at).toLocaleDateString()}
      </div>

      {isDroidCreated && (
        <span
          className="badge"
          style={{
            background: "var(--status-info-bg)",
            color: "var(--status-info)",
          }}
        >
          Droid created
        </span>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleShowFiles}
          className="btn-secondary text-xs px-3 py-1"
        >
          {showFiles ? "Hide files" : "Show files"}
        </button>

        <button
          onClick={handleDispatch}
          disabled={dispatchState !== "idle"}
          className="btn-secondary text-xs px-3 py-1"
        >
          {dispatchState === "idle" && "Dispatch droid"}
          {dispatchState === "loading" && "Dispatching..."}
          {dispatchState === "done" && "Dispatched"}
        </button>

        <button
          onClick={handleMerge}
          disabled={mergeState !== "idle"}
          className="btn-success text-xs px-3 py-1"
        >
          {mergeState === "idle" && "Merge"}
          {mergeState === "loading" && "Merging..."}
          {mergeState === "done" && "Merged"}
          {mergeState === "error" && "Merge failed"}
        </button>
      </div>

      {mergeError && (
        <p className="text-xs" style={{ color: "var(--status-error)", fontFamily: "var(--font-sans)" }}>
          {mergeError}
        </p>
      )}

      {showFiles && files && (
        <div className="space-y-2">
          {files.map((file) => (
            <FileDiff key={file.filename} file={file} />
          ))}
        </div>
      )}

      <InlineChat
        context={{
          type: "pr",
          number: pr.number,
          owner,
          repo,
          summary: pr.title,
        }}
      />
    </div>
  )
}
