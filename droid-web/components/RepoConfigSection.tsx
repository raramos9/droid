"use client"

import { useState } from "react"
import { ConfigEditor } from "./ConfigEditor"

interface Props {
  owner: string
  repo: string
  initialOverrides: string | null
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d={open ? "M2 4l4 4 4-4" : "M4 2l4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RepoConfigSection({ owner, repo, initialOverrides }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <button
        aria-label="Repo overrides"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 14px",
          background: "var(--surface)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
          fontSize: "0.8rem",
          fontWeight: 500,
        }}
      >
        <span style={{ color: "var(--text-tertiary)", display: "flex" }}>
          <ChevronIcon open={open} />
        </span>
        Repo overrides
      </button>

      {open && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-raised)",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
              margin: "0 0 12px",
            }}
          >
            Override or extend the global config for this repo only.
          </p>
          <ConfigEditor
            url="/api/config/repo"
            fetchKey="overrides"
            initialValue={initialOverrides ?? ""}
            extraBody={{ owner, repo }}
          />
        </div>
      )}
    </div>
  )
}
