"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { RepoGrid } from "@/components/RepoGrid"
import type { EnrolledRepo, Repo } from "@/lib/types"

interface Props {
  enrolledRepos: EnrolledRepo[]
}

const PAGE_SIZE = 20

export function DashboardClient({ enrolledRepos }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
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

  const enrolledSet = useMemo(
    () => new Set(enrolledRepos.map((r) => `${r.owner}/${r.repo}`)),
    [enrolledRepos]
  )

  const filteredRepos = useMemo(
    () =>
      query
        ? allRepos.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase()))
        : allRepos,
    [allRepos, query]
  )

  const totalPages = Math.ceil(filteredRepos.length / PAGE_SIZE)
  const pagedRepos = filteredRepos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleQueryChange(value: string) {
    setQuery(value)
    setPage(1)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed")
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          All repositories
        </h2>
        <input
          type="text"
          placeholder="Find a repository..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          style={{
            padding: "5px 10px",
            fontSize: "0.8rem",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            outline: "none",
            width: 220,
          }}
        />
      </div>

      {error && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--status-error)",
            fontFamily: "var(--font-sans)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
            margin: 0,
          }}
        >
          Loading...
        </p>
      ) : (
        <RepoGrid
          repos={pagedRepos}
          enrolledSet={enrolledSet}
          enrolling={enrolling}
          onEnroll={enroll}
        />
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
