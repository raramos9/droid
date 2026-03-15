import { KEYBOARD_SHORTCUTS } from "@/lib/constants"

export function SidebarKeyboardHints() {
  return (
    <div style={{ padding: "8px 12px 4px" }}>
      <p
        style={{
          fontSize: "0.6rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-sans)",
          marginBottom: 6,
        }}
      >
        Shortcuts
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {shortcut.label}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {shortcut.keys.map((key, ki) => (
                <kbd
                  key={ki}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6rem",
                    padding: "1px 3px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface-raised)",
                    color: "var(--text-tertiary)",
                    lineHeight: 1.4,
                  }}
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
