"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Repo {
  full_name: string
  owner: { login: string }
  name: string
  private: boolean
}

interface Props {
  onClose: () => void
}

export function EnrollModal({ onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/github/repos?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Failed to search repos")
      setRepos(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  async function enroll(repo: Repo) {
    setEnrolling(repo.full_name)
    setError(null)
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: repo.owner.login, repo: repo.name }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? "Enrollment failed")
      }
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed")
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="w-full max-w-lg p-6 space-y-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="font-display text-sm uppercase tracking-widest font-medium"
            style={{ color: "var(--accent)" }}
          >
            Enroll Repository
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="font-data text-lg leading-none transition-colors"
            style={{ color: "var(--text-ter)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-pri)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-ter)" }}
          >
            &times;
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search your repos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="flex-1 px-3 py-2 text-sm font-data outline-none"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-pri)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)" }}
          />
          <button
            onClick={search}
            disabled={loading}
            className="btn-amber px-4 py-2 disabled:opacity-40"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {error && (
          <p className="font-data text-xs" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}

        {repos.length > 0 && (
          <ul
            className="max-h-64 overflow-y-auto"
            style={{ border: "1px solid var(--border)" }}
          >
            {repos.map((repo) => (
              <li
                key={repo.full_name}
                className="flex items-center justify-between px-3 py-2.5 transition-colors"
                style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)" }}
              >
                <span className="font-data text-sm" style={{ color: "var(--text-pri)" }}>
                  {repo.full_name}
                  {repo.private && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--text-ter)" }}
                    >
                      [private]
                    </span>
                  )}
                </span>
                <button
                  onClick={() => enroll(repo)}
                  disabled={enrolling === repo.full_name}
                  className="font-data text-xs uppercase tracking-wider px-3 py-1 transition-all disabled:opacity-40"
                  style={{
                    color: "var(--accent)",
                    border: "1px solid var(--accent-dim)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (enrolling !== repo.full_name) {
                      e.currentTarget.style.borderColor = "var(--accent)"
                      e.currentTarget.style.background = "var(--accent)"
                      e.currentTarget.style.color = "var(--bg)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-dim)"
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "var(--accent)"
                  }}
                >
                  {enrolling === repo.full_name ? "..." : "Enroll"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
