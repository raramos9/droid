import Link from "next/link"

interface Repo {
  owner: string
  repo: string
}

interface Props {
  repos: Repo[]
  inboxCount: number
  collapsed: boolean
}

function InboxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 9h2.5l1.5 2h2l1.5-2H12V4a1 1 0 00-1-1H3a1 1 0 00-1 1v5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
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

function NavLink({
  href,
  icon,
  label,
  badge,
  collapsed,
}: {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: collapsed ? "6px 0" : "5px 10px",
        justifyContent: collapsed ? "center" : undefined,
        color: "var(--text-secondary)",
        textDecoration: "none",
        fontSize: "0.8rem",
        fontFamily: "var(--font-sans)",
        borderRadius: "var(--radius-sm)",
        margin: "1px 6px",
        transition: "background var(--transition), color var(--transition)",
        position: "relative",
      }}
    >
      <span style={{ flexShrink: 0, color: "var(--text-tertiary)", display: "flex" }}>
        {icon}
      </span>
      {!collapsed && (
        <span
          style={{
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      )}
      {!collapsed && badge != null && badge > 0 && (
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: "999px",
            background: "var(--status-info-bg)",
            color: "var(--status-info)",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

export function SidebarNav({ repos, inboxCount, collapsed }: Props) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
      <NavLink
        href="/dashboard/inbox"
        icon={<InboxIcon />}
        label="Inbox"
        badge={inboxCount}
        collapsed={collapsed}
      />
      <NavLink
        href="/dashboard/settings"
        icon={<SettingsIcon />}
        label="Settings"
        collapsed={collapsed}
      />

      {repos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {!collapsed && (
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                padding: "0 12px 6px",
                fontFamily: "var(--font-sans)",
                margin: 0,
              }}
            >
              Repositories
            </p>
          )}
          {repos.map(({ owner, repo }) => (
            <NavLink
              key={`${owner}/${repo}`}
              href={`/dashboard/${owner}/${repo}`}
              icon={<RepoIcon />}
              label={repo}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
