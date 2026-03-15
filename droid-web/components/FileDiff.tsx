"use client"

import { useState } from "react"
import type { GitHubPRFile } from "@/lib/types"

interface Props {
  file: GitHubPRFile
}

const MAX_LINES = 200

function getLineColor(line: string): string {
  if (line.startsWith("@@")) return "var(--text-tertiary)"
  if (line.startsWith("+") && !line.startsWith("+++")) return "var(--status-success)"
  if (line.startsWith("-") && !line.startsWith("---")) return "var(--status-error)"
  return "var(--text-secondary)"
}

export function FileDiff({ file }: Props) {
  const [showAll, setShowAll] = useState(false)

  const lines = file.patch?.split("\n") ?? []
  const truncated = !showAll && lines.length > MAX_LINES
  const visibleLines = truncated ? lines.slice(0, MAX_LINES) : lines
  const remainingCount = lines.length - MAX_LINES

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between py-1">
        <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
          {file.filename}
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
          +{file.additions} -{file.deletions}
        </span>
      </div>

      {!file.patch ? (
        <p className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
          Binary file or no diff available
        </p>
      ) : (
        <>
          <pre
            className="overflow-x-auto p-2 text-xs font-mono"
            style={{
              background: "var(--surface-raised)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            {visibleLines.map((line, i) => (
              <span
                key={i}
                style={{ color: getLineColor(line), display: "block" }}
              >
                {line}
              </span>
            ))}
          </pre>
          {truncated && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              ... {remainingCount} more lines
            </button>
          )}
        </>
      )}
    </div>
  )
}
