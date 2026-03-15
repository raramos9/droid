"use client"

import { ConfigEditor } from "@/components/ConfigEditor"

interface Props {
  initialConfigText: string | null
}

export function SettingsClient({ initialConfigText }: Props) {
  return (
    <div style={{ padding: "32px 24px", maxWidth: 720, width: "100%" }}>
      <h1
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          margin: "0 0 4px",
        }}
      >
        Settings
      </h1>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
          margin: "0 0 24px",
        }}
      >
        Paste your Claude config below. This is injected into the agent system prompt for all your
        repos.
      </p>

      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 10px",
          margin: "0 0 16px",
        }}
      >
        {"cat ~/.claude/CLAUDE.md ~/.claude/rules/*.md 2>/dev/null | pbcopy"}
      </p>

      <ConfigEditor url="/api/config" fetchKey="configText" initialValue={initialConfigText ?? ""} />
    </div>
  )
}
