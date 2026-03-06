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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl p-6 space-y-4">
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

        {repos.length > 0 && (
          <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-100 rounded border border-zinc-200">
            {repos.map((repo) => (
              <li key={repo.full_name} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-zinc-800">{repo.full_name}</span>
                <button
                  onClick={() => enroll(repo)}
                  disabled={enrolling === repo.full_name}
                  className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {enrolling === repo.full_name ? "Enrolling..." : "Enroll"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
