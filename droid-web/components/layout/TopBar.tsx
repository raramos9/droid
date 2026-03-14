"use client"

import Link from "next/link"
import { useCommandPalette } from "@/components/command-palette/CommandPaletteProvider"

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

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function TopBar({ crumbs }: Props) {
  const { setOpen, setMobileSidebarOpen } = useCommandPalette()

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
      {/* Hamburger — mobile only (hidden via CSS on desktop) */}
      <button
        className="hamburger-btn"
        aria-label="Open sidebar"
        onClick={() => setMobileSidebarOpen(true)}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
          marginRight: 8,
          flexShrink: 0,
        }}
      >
        <MenuIcon />
      </button>

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
        onClick={() => setOpen(true)}
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
