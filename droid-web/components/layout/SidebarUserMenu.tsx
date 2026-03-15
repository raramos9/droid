"use client"

import { ThemeToggle } from "@/components/ThemeToggle"

interface User {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface Props {
  user: User
  collapsed: boolean
}

function UserInitialIcon({ name }: { name: string }) {
  return (
    <span
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
        fontSize: "0.65rem",
        fontWeight: 600,
        color: "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        userSelect: "none",
      }}
    >
      {name[0]?.toUpperCase() ?? "U"}
    </span>
  )
}

export function SidebarUserMenu({ user, collapsed }: Props) {
  const displayName = user.name ?? user.email ?? "User"

  return (
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
      <button
        aria-label="User menu"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          flex: 1,
          minWidth: 0,
          textAlign: "left",
        }}
      >
        <UserInitialIcon name={displayName} />
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
            {displayName}
          </span>
        )}
      </button>
      {!collapsed && <ThemeToggle />}
    </div>
  )
}
