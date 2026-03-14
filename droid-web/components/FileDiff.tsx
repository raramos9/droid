"use client"

import { useState } from "react"
import type { GitHubPRFile } from "@/lib/types"

interface Props {
  file: GitHubPRFile
}

const MAX_LINES = 200

function getLineColor(line: string): string {
  if (line.startsWith("@@")) return "var(--accent)"
  if (line.startsWith("+") && !line.startsWith("+++")) return "var(--green)"
  if (line.startsWith("-") && !line.startsWith("---")) return "var(--red)"
  return "var(--text-sec)"
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
        <span className="font-data text-xs" style={{ color: "var(--text-sec)" }}>
          {file.filename}
        </span>
        <span className="font-data text-xs" style={{ color: "var(--text-ter)" }}>
          +{file.additions} -{file.deletions}
        </span>
      </div>

      {!file.patch ? (
        <p className="font-data text-xs" style={{ color: "var(--text-ter)" }}>
          Binary file or no diff available
        </p>
      ) : (
        <>
          <pre
            className="overflow-x-auto p-2 text-xs font-data"
            style={{ background: "var(--surface-2)", borderRadius: "2px" }}
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
              className="font-data text-xs mt-1"
              style={{ color: "var(--accent)" }}
            >
              ... {remainingCount} more lines
            </button>
          )}
        </>
      )}
    </div>
  )
}
