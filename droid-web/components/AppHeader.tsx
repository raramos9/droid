import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

interface Crumb {
  label: string
  href?: string
}

interface Props {
  crumbs?: Crumb[]
  user?: string | null
}

export function AppHeader({ crumbs, user }: Props) {
  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="font-semibold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
          >
            droid
          </Link>

          {crumbs && crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              <span style={{ color: "var(--border-strong)" }}>/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{ color: "var(--text-secondary)" }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "var(--text-primary)" }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
            >
              {user}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
