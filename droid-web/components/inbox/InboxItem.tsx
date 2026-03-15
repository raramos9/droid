"use client"

import type { PendingActionWithContext } from "@/lib/types"
import { PendingActionPanel } from "@/components/PendingActionPanel"

interface Props {
  action: PendingActionWithContext
  selected: boolean
  onSelect: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function InboxItem({ action, selected, onSelect }: Props) {
  const repoLabel = `${action.repo_owner}/${action.repo_name}`
  const issueLabel = action.issue_number
    ? `#${action.issue_number}: ${action.issue_title ?? "Issue"}`
    : action.issue_title ?? "Issue"

  return (
    <div
      style={{
        background: selected ? "var(--selection-bg)" : "transparent",
        borderLeft: selected ? "2px solid var(--border-strong)" : "2px solid transparent",
        borderBottom: "1px solid var(--border)",
        transition: "background var(--transition)",
      }}
    >
      {/* Compact row */}
      <div
        onClick={onSelect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          cursor: "pointer",
          minHeight: 38,
        }}
      >
        {/* Repo badge */}
        <span
          style={{
            fontSize: "0.7rem",
            fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "1px 5px",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {repoLabel}
        </span>

        {/* Issue title */}
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
          {issueLabel}
        </span>

        {/* Tool name */}
        <span
          style={{
            fontSize: "0.7rem",
            fontFamily: "var(--font-mono)",
            color: "var(--status-warning)",
            flexShrink: 0,
          }}
        >
          {action.tool}
        </span>

        {/* Time ago */}
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {timeAgo(action.created_at)}
        </span>
      </div>

      {/* Expanded: PendingActionPanel inline */}
      {selected && (
        <div style={{ padding: "0 14px 12px" }}>
          <PendingActionPanel action={action} />
        </div>
      )}
    </div>
  )
}
