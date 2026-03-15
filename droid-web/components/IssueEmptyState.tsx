interface Props {
  type: "issues" | "prs"
  state: "open" | "closed"
}

const messages: Record<string, Record<string, string>> = {
  issues: {
    open: "There aren't any open issues.",
    closed: "There aren't any closed issues.",
  },
  prs: {
    open: "There aren't any open pull requests.",
    closed: "There aren't any closed pull requests.",
  },
}

function IssueIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--text-tertiary)" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  )
}

function PrIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--text-tertiary)" }}>
      <circle cx="5" cy="4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="11" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M5 6.5v3M11 9.5v-3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function IssueEmptyState({ type, state }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "48px 0",
      }}
    >
      {type === "issues" ? <IssueIcon /> : <PrIcon />}
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
          margin: 0,
        }}
      >
        {messages[type][state]}
      </p>
    </div>
  )
}
