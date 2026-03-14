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
        body: JSON.stringify({ owner, repo, type: "pr", prNumber: pr.number }),
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
    } catch (err) {
      setMergeState("error")
      setMergeError(err instanceof Error ? err.message : "Network error")
    }
  }

  const handleShowFiles = async () => {
    if (showFiles) {
      setShowFiles(false)
      return
    }
    if (files === null) {
      try {
        const res = await fetch(`/api/github/prs/${pr.number}/files?owner=${owner}&repo=${repo}`)
        setFiles(await res.json())
      } catch {
        setFiles([])
      }
    }
    setShowFiles(true)
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Compact header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          minHeight: 38,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            flexShrink: 0,
            minWidth: 32,
          }}
        >
          #{pr.number}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {pr.title}
        </span>
        {isDroidCreated && (
          <span
            className="badge"
            style={{ background: "var(--status-info-bg)", color: "var(--status-info)", flexShrink: 0 }}
          >
            Droid created
          </span>
        )}
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {new Date(pr.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Detail section */}
      <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
            fontFamily: "var(--font-mono)",
            margin: 0,
          }}
        >
          {pr.head.ref} → {pr.base.ref} on{" "}
          {new Date(pr.created_at).toLocaleDateString()}
        </p>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={handleShowFiles}
            className="btn-secondary"
            style={{ padding: "3px 10px", fontSize: "0.75rem" }}
          >
            {showFiles ? "Hide files" : "Show files"}
          </button>
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
          <button
            onClick={handleMerge}
            disabled={mergeState !== "idle"}
            className="btn-success"
            style={{ padding: "3px 10px", fontSize: "0.75rem" }}
          >
            {mergeState === "idle" && "Merge"}
            {mergeState === "loading" && "Merging..."}
            {mergeState === "done" && "Merged"}
            {mergeState === "error" && "Merge failed"}
          </button>
        </div>

        {mergeError && (
          <p style={{ fontSize: "0.75rem", color: "var(--status-error)", fontFamily: "var(--font-sans)", margin: 0 }}>
            {mergeError}
          </p>
        )}

        {showFiles && files && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((file) => (
              <FileDiff key={file.filename} file={file} />
            ))}
          </div>
        )}

        <InlineChat
          context={{ type: "pr", number: pr.number, owner, repo, summary: pr.title }}
        />
      </div>
    </div>
  )
}
