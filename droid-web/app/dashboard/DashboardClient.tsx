"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { EnrolledRepo } from "@/lib/types"

interface Repo {
  full_name: string
  owner: { login: string }
  name: string
  private: boolean
  permissions?: { admin: boolean }
  pushed_at?: string
}

interface Props {
  enrolledRepos: EnrolledRepo[]
}

const PAGE_SIZE = 20

export function DashboardClient({ enrolledRepos }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [activeQuery, setActiveQuery] = useState("")
  const [allRepos, setAllRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function loadRepos() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/github/repos")
        if (!res.ok) throw new Error("Failed to load repositories")
        setAllRepos(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repositories")
      } finally {
        setLoading(false)
      }
    }
    loadRepos()
  }, [])

  function search() {
    setActiveQuery(query)
    setPage(1)
  }

  const enrolledSet = new Set(enrolledRepos.map((r) => `${r.owner}/${r.repo}`))

  const filteredRepos = activeQuery
    ? allRepos.filter((r) => r.full_name.toLowerCase().includes(activeQuery.toLowerCase()))
    : allRepos

  const totalPages = Math.ceil(filteredRepos.length / PAGE_SIZE)
  const pagedRepos = filteredRepos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed")
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <div className="space-y-4">
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

      {pagedRepos.length > 0 && (
        <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {pagedRepos.map((repo) => {
            const enrolled = enrolledSet.has(repo.full_name)
            return (
              <div
                key={repo.full_name}
                className="card flex flex-col justify-between p-4"
                style={{
                  borderLeft: enrolled ? `3px solid var(--status-success)` : undefined,
                }}
              >
                <div className="mb-3">
                  <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                    {repo.full_name}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span
                    className="badge"
                    style={{
                      background: "var(--surface-raised)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {repo.private ? "Private" : "Public"}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "—"}
                  </span>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", marginBottom: "12px" }} />

                {enrolled ? (
                  <div className="flex items-center justify-between">
                    <span
                      className="badge"
                      style={{
                        background: "var(--status-success-bg)",
                        color: "var(--status-success)",
                      }}
                    >
                      Enrolled
                    </span>
                    <Link
                      href={`/dashboard/${repo.owner.login}/${repo.name}`}
                      className="text-xs transition-colors"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}
                    >
                      View activity →
                    </Link>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => enroll(repo)}
                      disabled={enrolling === repo.full_name}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      {enrolling === repo.full_name ? "Enrolling..." : "Enroll"}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex gap-1 justify-center">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className="text-xs px-2.5 py-1"
              style={{
                background: page === i + 1 ? "var(--interactive)" : "var(--surface-raised)",
                color: page === i + 1 ? "var(--bg)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
