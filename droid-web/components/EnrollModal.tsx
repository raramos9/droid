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
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-lg p-6 space-y-5"
        style={{
          background: "var(--surface-overlay)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
          >
            Enroll a repository
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-lg leading-none"
            style={{
              color: "var(--text-tertiary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "color var(--transition)",
            }}
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
            className="flex-1 px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            onClick={search}
            disabled={loading}
            className="btn-primary px-4 py-2"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--status-error)", fontFamily: "var(--font-sans)" }}>
            {error}
          </p>
        )}

        {repos.length > 0 && (
          <ul
            className="max-h-64 overflow-y-auto"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {repos.map((repo) => (
              <li
                key={repo.full_name}
                className="flex items-center justify-between px-3 py-2.5 transition-colors"
                style={{
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                  {repo.full_name}
                  {repo.private && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      private
                    </span>
                  )}
                </span>
                <button
                  onClick={() => enroll(repo)}
                  disabled={enrolling === repo.full_name}
                  className="btn-primary text-xs px-3 py-1"
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
