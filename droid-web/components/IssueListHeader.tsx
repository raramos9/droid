"use client"

interface Props {
  activeState: "open" | "closed"
  onStateChange: (state: "open" | "closed") => void
  authors: string[]
  selectedAuthor: string | null
  onAuthorChange: (author: string | null) => void
  labels?: string[]
  selectedLabel: string | null
  onLabelChange: (label: string | null) => void
  showLabels?: boolean
}

const selectStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
}

export function IssueListHeader({
  activeState,
  onStateChange,
  authors,
  selectedAuthor,
  onAuthorChange,
  labels = [],
  selectedLabel,
  onLabelChange,
  showLabels = false,
}: Props) {
  const stateButtonStyle = (state: "open" | "closed"): React.CSSProperties => ({
    fontWeight: activeState === state ? 600 : 400,
    color: activeState === state ? "var(--text-primary)" : "var(--text-tertiary)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
  })

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        background: "var(--bg-subtle)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <button style={stateButtonStyle("open")} onClick={() => onStateChange("open")}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="3" />
          </svg>
          Open
        </button>
        <button style={stateButtonStyle("closed")} onClick={() => onStateChange("closed")}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Closed
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={selectedAuthor ?? ""}
          onChange={(e) => onAuthorChange(e.target.value === "" ? null : e.target.value)}
          style={selectStyle}
        >
          <option value="">Author</option>
          {authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>

        {showLabels && (
          <select
            value={selectedLabel ?? ""}
            onChange={(e) => onLabelChange(e.target.value === "" ? null : e.target.value)}
            style={selectStyle}
          >
            <option value="">Label</option>
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
