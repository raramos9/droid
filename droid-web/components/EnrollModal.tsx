"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  onClose: () => void
  enrolledRepos: EnrolledRepo[]
}

const PAGE_SIZE = 20

export function EnrollModal({ onClose, enrolledRepos }: Props) {
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
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed")
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Enroll a repository</h2>
          <button aria-label="Close" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search your repos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <button
            onClick={search}
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {pagedRepos.length > 0 && (
          <ul className="divide-y divide-zinc-100 rounded border border-zinc-200 max-h-72 overflow-y-auto">
            {pagedRepos.map((repo) => {
              const enrolled = enrolledSet.has(repo.full_name)
              return (
                <li key={repo.full_name} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{repo.full_name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${repo.private ? "bg-zinc-100 text-zinc-500" : "bg-blue-50 text-blue-600"}`}>
                    {repo.private ? "Private" : "Public"}
                  </span>
                  <span className="text-xs text-zinc-400 w-24 text-right shrink-0">
                    {repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString() : "—"}
                  </span>
                  {enrolled ? (
                    <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 font-medium">Enrolled</span>
                  ) : (
                    <button
                      onClick={() => enroll(repo)}
                      disabled={enrolling === repo.full_name}
                      className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
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
                className={`px-2.5 py-1 rounded text-xs font-medium ${page === i + 1 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
