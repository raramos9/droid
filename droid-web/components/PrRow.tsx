"use client"

import { useState } from "react"
import type { GitHubPR } from "@/lib/types"
import { timeAgo } from "@/lib/time-ago"

interface Props {
  pr: GitHubPR
  isDroidCreated: boolean
  isSelected: boolean
  onClick: () => void
}

function PrOpenIcon() {
  return (
    <svg
      data-testid="pr-open-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ color: "var(--status-info)", flexShrink: 0 }}
    >
      <circle cx="5" cy="4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6.5v3M11 9.5v-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function PrClosedIcon() {
  return (
    <svg
      data-testid="pr-closed-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
    >
      <circle cx="5" cy="4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6.5v3M11 9.5v-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 12l2 2 2-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

export function PrRow({ pr, isDroidCreated, isSelected, onClick }: Props) {
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
        {pr.state === "open" ? <PrOpenIcon /> : <PrClosedIcon />}
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
            {pr.title}
          </span>
          {pr.labels.map((label) => (
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
          #{pr.number} {"\u00B7"} {pr.user.login} opened {timeAgo(pr.created_at)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {pr.draft && (
          <span
            className="badge"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            Draft
          </span>
        )}
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
        {pr.comments > 0 && (
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
            {pr.comments}
          </span>
        )}
      </div>
    </div>
  )
}
