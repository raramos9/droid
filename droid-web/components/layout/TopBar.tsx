import Link from "next/link"

interface Crumb {
  label: string
  href?: string
}

interface Props {
  crumbs?: Crumb[]
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function TopBar({ crumbs }: Props) {
  return (
    <header
      style={{
        height: "var(--topbar-height)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "var(--surface)",
        flexShrink: 0,
      }}
    >
      {/* Breadcrumbs */}
      <nav
        aria-label="breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.8rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        {crumbs?.map((crumb, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && (
              <span style={{ color: "var(--border-strong)", userSelect: "none" }}>/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ color: "var(--text-primary)" }}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Cmd+K trigger */}
      <button
        aria-label="Command palette"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "transparent",
          color: "var(--text-tertiary)",
          fontSize: "0.75rem",
          fontFamily: "var(--font-sans)",
          cursor: "pointer",
          transition: "border-color var(--transition), color var(--transition)",
        }}
      >
        <SearchIcon />
        <span>Search</span>
        <kbd
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            padding: "1px 4px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text-tertiary)",
          }}
        >
          ⌘K
        </kbd>
      </button>
    </header>
  )
}
