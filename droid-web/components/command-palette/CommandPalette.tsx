"use client"

import { useState, useEffect, useRef } from "react"
import type { CommandAction } from "./command-actions"
import { filterActions } from "./command-actions"

interface Props {
  open: boolean
  onClose: () => void
  actions: CommandAction[]
}

function groupBySection(actions: CommandAction[]): Map<string, CommandAction[]> {
  const map = new Map<string, CommandAction[]>()
  for (const action of actions) {
    const group = map.get(action.section) ?? []
    group.push(action)
    map.set(action.section, group)
  }
  return map
}

export function CommandPalette({ open, onClose, actions }: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  const filtered = filterActions(actions, query)
  const groups = groupBySection(filtered)

  const handleAction = (action: CommandAction) => {
    action.onSelect()
    onClose()
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          animation: "fade-in 0.12s ease",
        }}
      >
        {/* Search input */}
        <div style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 14px" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, color: "var(--text-tertiary)" }}>
            <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search actions, repos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose()
            }}
            style={{
              flex: 1,
              padding: "14px 10px",
              fontSize: "0.875rem",
              fontFamily: "var(--font-sans)",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
          {filtered.length === 0 ? (
            <p
              style={{
                padding: "20px 16px",
                fontSize: "0.8rem",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
                textAlign: "center",
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            Array.from(groups.entries()).map(([section, sectionActions]) => (
              <div key={section}>
                <p
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    padding: "6px 14px 3px",
                    fontFamily: "var(--font-sans)",
                    margin: 0,
                  }}
                >
                  {section}
                </p>
                {sectionActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "7px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontFamily: "var(--font-sans)",
                      color: "var(--text-primary)",
                      textAlign: "left",
                      transition: "background var(--transition)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--selection-bg)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <span>{action.label}</span>
                    {action.shortcut && (
                      <kbd
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.65rem",
                          padding: "2px 5px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          background: "var(--surface-raised)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
