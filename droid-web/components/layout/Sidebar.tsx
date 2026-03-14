"use client"

import Link from "next/link"
import { useSidebarState } from "@/lib/hooks/useSidebarState"

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
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M5 11l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RepoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5h4M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar({ user, repos }: Props) {
  const { collapsed, toggle } = useSidebarState()

  return (
    <aside
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

      {/* Nav: scrollable middle */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {/* Inbox link */}
        <NavItem href="/dashboard/inbox" collapsed={collapsed} icon={<InboxIcon />} label="Inbox" />

        {/* Repos section */}
        {!collapsed && repos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                padding: "0 12px 6px",
                fontFamily: "var(--font-sans)",
              }}
            >
              Repositories
            </p>
            {repos.map(({ owner, repo }) => (
              <NavItem
                key={`${owner}/${repo}`}
                href={`/dashboard/${owner}/${repo}`}
                collapsed={collapsed}
                icon={<RepoIcon />}
                label={repo}
              />
            ))}
          </div>
        )}

        {collapsed && repos.map(({ owner, repo }) => (
          <NavItem
            key={`${owner}/${repo}`}
            href={`/dashboard/${owner}/${repo}`}
            collapsed={collapsed}
            icon={<RepoIcon />}
            label={repo}
          />
        ))}
      </div>

      {/* User footer */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--text-tertiary)",
          }}
        >
          <UserIcon />
        </div>
        {!collapsed && (
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.name ?? user.email ?? "User"}
          </span>
        )}
      </div>
    </aside>
  )
}

function InboxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 9h2.5l1.5 2h2l1.5-2H12V4a1 1 0 00-1-1H3a1 1 0 00-1 1v5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function NavItem({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: collapsed ? "6px 0" : "5px 12px",
        justifyContent: collapsed ? "center" : undefined,
        color: "var(--text-secondary)",
        textDecoration: "none",
        fontSize: "0.8rem",
        fontFamily: "var(--font-sans)",
        borderRadius: "var(--radius-sm)",
        margin: "1px 6px",
        transition: "background var(--transition), color var(--transition)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-raised)"
        e.currentTarget.style.color = "var(--text-primary)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent"
        e.currentTarget.style.color = "var(--text-secondary)"
      }}
    >
      <span style={{ flexShrink: 0, color: "var(--text-tertiary)" }}>{icon}</span>
      {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
    </Link>
  )
}
