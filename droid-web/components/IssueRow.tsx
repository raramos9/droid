"use client"

import { useState } from "react"
import type { GitHubIssue, AgentRun } from "@/lib/types"
import { timeAgo } from "@/lib/time-ago"

interface Props {
  issue: GitHubIssue
  run: AgentRun | null
  isSelected: boolean
  onClick: () => void
}

function OpenIcon() {
  return (
    <svg
      data-testid="issue-open-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ color: "var(--status-success)", flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" />
    </svg>
  )
}

function ClosedIcon() {
  return (
    <svg
      data-testid="issue-closed-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--text-tertiary)" }}>
      <path d="M2.5 2a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h2.793l.853.854a.5.5 0 0 0 .708 0L7.707 11H13.5a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-11z" />
    </svg>
  )
}

export function IssueRow({ issue, run, isSelected, onClick }: Props) {
  const [hovered, setHovered] = useState(false)

  const background = isSelected
    ? "var(--selection-bg)"
    : hovered
      ? "var(--bg-subtle)"
      : "transparent"

  const borderLeft = isSelected
    ? "2px solid var(--border-strong)"
    : "2px solid transparent"

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 16px",
        background,
        borderLeft,
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ paddingTop: 2 }}>
        {issue.state === "open" ? <OpenIcon /> : <ClosedIcon />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {issue.title}
          </span>
          {issue.labels.map((label) => (
            <span
              key={label.name}
              style={{
                background: `#${label.color}26`,
                color: `#${label.color}`,
                borderRadius: "var(--radius-sm)",
                padding: "1px 6px",
                fontSize: "0.7rem",
                fontWeight: 500,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            marginTop: 2,
          }}
        >
          #{issue.number} {"\u00B7"} {issue.user.login} opened {timeAgo(issue.created_at)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {run && (
          <span
            className="badge"
            style={{
              background: "var(--status-success-bg)",
              color: "var(--status-success)",
            }}
          >
            Droid active
          </span>
        )}
        {issue.comments > 0 && (
          <span
            data-testid="comment-count"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
            }}
          >
            <CommentIcon />
            {issue.comments}
          </span>
        )}
      </div>
    </div>
  )
}
