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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search your repos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          style={{
            flex: 1,
            padding: "6px 10px",
            fontSize: "0.8rem",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
        />
        <button
          onClick={search}
          disabled={loading}
          className="btn-primary"
          style={{ padding: "6px 14px", fontSize: "0.8rem" }}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: "0.75rem", color: "var(--status-error)", fontFamily: "var(--font-sans)" }}>
          {error}
        </p>
      )}

      {/* Dense list */}
      {pagedRepos.length > 0 && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          {pagedRepos.map((repo, i) => {
            const enrolled = enrolledSet.has(repo.full_name)
            return (
              <div
                key={repo.full_name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  borderBottom: i < pagedRepos.length - 1 ? "1px solid var(--border)" : undefined,
                  background: "var(--surface)",
                  transition: "background var(--transition)",
                  borderLeft: enrolled ? "2px solid var(--status-success)" : "2px solid transparent",
                }}
              >
                {/* Repo name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {repo.full_name}
                </span>

                {/* Visibility badge */}
                <span
                  className="badge"
                  style={{
                    background: "var(--surface-raised)",
                    color: "var(--text-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  {repo.private ? "Private" : "Public"}
                </span>

                {/* Date */}
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                    minWidth: 70,
                    textAlign: "right",
                  }}
                >
                  {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "—"}
                </span>

                {/* Enroll / enrolled actions */}
                {enrolled ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-sans)",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      View activity →
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => enroll(repo)}
                    disabled={enrolling === repo.full_name}
                    className="btn-secondary"
                    style={{ padding: "3px 10px", fontSize: "0.75rem", flexShrink: 0 }}
                  >
                    {enrolling === repo.full_name ? "Enrolling..." : "Enroll"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              aria-label={String(i + 1)}
              style={{
                fontSize: "0.75rem",
                padding: "3px 8px",
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
