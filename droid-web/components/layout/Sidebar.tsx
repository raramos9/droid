"use client"

import Link from "next/link"
import { useSidebarState } from "@/lib/hooks/useSidebarState"
import { useCommandPalette } from "@/components/command-palette/CommandPaletteProvider"
import { SidebarNav } from "./SidebarNav"
import { SidebarUserMenu } from "./SidebarUserMenu"
import { SidebarKeyboardHints } from "./SidebarKeyboardHints"

interface Repo {
  owner: string
  repo: string
}

interface User {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface Props {
  user: User
  repos: Repo[]
  inboxCount: number
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M9 11L5 7l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M5 11l4-4-4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Sidebar({ user, repos, inboxCount }: Props) {
  const { collapsed, toggle } = useSidebarState()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useCommandPalette()

  return (
    <>
      {mobileSidebarOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 49,
          }}
        />
      )}
    <aside
      data-sidebar=""
      className={mobileSidebarOpen ? "sidebar-mobile-open" : undefined}
      style={{
        width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        transition: "width 200ms ease",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Header: logo + toggle */}
      <div
        style={{
          height: "var(--topbar-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        {!collapsed && (
          <Link
            href="/dashboard"
            style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            droid
          </Link>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            flexShrink: 0,
            marginLeft: collapsed ? "auto" : undefined,
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Nav */}
      <SidebarNav repos={repos} inboxCount={inboxCount} collapsed={collapsed} />

      {/* Keyboard hints (expanded only) */}
      {!collapsed && <SidebarKeyboardHints />}

      {/* User footer */}
      <SidebarUserMenu user={user} collapsed={collapsed} />
    </aside>
    </>
  )
}
