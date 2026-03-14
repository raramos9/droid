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
          className="flex-1 px-3 py-2 text-sm font-data outline-none"
          style={{
            background: "var(--surface)",
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

      {pagedRepos.length > 0 && (
        <ul style={{ border: "1px solid var(--border)" }}>
          {pagedRepos.map((repo, i) => {
            const enrolled = enrolledSet.has(repo.full_name)
            return (
              <li
                key={repo.full_name}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                style={{
                  background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span className="flex-1 font-data text-sm truncate" style={{ color: "var(--text-pri)" }}>
                  {repo.full_name}
                </span>
                <span
                  className="font-data text-xs px-1.5 py-0.5"
                  style={{
                    color: repo.private ? "var(--text-ter)" : "var(--blue)",
                    border: `1px solid ${repo.private ? "var(--border)" : "var(--blue)"}`,
                  }}
                >
                  {repo.private ? "Private" : "Public"}
                </span>
                <span className="font-data text-xs w-24 text-right shrink-0" style={{ color: "var(--text-ter)" }}>
                  {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "—"}
                </span>
                {enrolled ? (
                  <>
                    <span
                      className="font-data text-xs px-2 py-0.5"
                      style={{
                        color: "var(--green)",
                        border: "1px solid var(--green)",
                      }}
                    >
                      Enrolled
                    </span>
                    <Link
                      href={`/dashboard/${repo.owner.login}/${repo.name}`}
                      className="font-data text-xs transition-colors"
                      style={{ color: "var(--accent)" }}
                    >
                      View activity →
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={() => enroll(repo)}
                    disabled={enrolling === repo.full_name}
                    className="font-data text-xs px-3 py-1 uppercase tracking-wider transition-all disabled:opacity-40"
                    style={{
                      color: "var(--accent)",
                      border: "1px solid var(--accent-dim)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (enrolling !== repo.full_name) {
                        e.currentTarget.style.background = "var(--accent)"
                        e.currentTarget.style.color = "var(--bg)"
                        e.currentTarget.style.borderColor = "var(--accent)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "var(--accent)"
                      e.currentTarget.style.borderColor = "var(--accent-dim)"
                    }}
                  >
                    {enrolling === repo.full_name ? "Enrolling..." : "Enroll"}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex gap-1 justify-center">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className="font-data px-2.5 py-1 text-xs transition-colors"
              style={{
                background: page === i + 1 ? "var(--accent)" : "var(--surface-2)",
                color: page === i + 1 ? "var(--bg)" : "var(--text-sec)",
                border: "1px solid var(--border)",
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
