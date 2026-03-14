"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { AgentRun, GitHubIssue, GitHubPR } from "@/lib/types"
import { IssueCard } from "./IssueCard"
import { PrCard } from "./PrCard"

const DROID_BOT_USERNAME = "getdroid[bot]"

interface Props {
  owner: string
  repo: string
  runsMap: Record<string, AgentRun>
}

export function RepoTabs({ owner, repo, runsMap }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeTab = searchParams.get("tab") ?? "issues"

  const [issues, setIssues] = useState<GitHubIssue[] | null>(null)
  const [prs, setPrs] = useState<GitHubPR[] | null>(null)
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [prsLoading, setPrsLoading] = useState(false)
  const [issuesError, setIssuesError] = useState<string | null>(null)
  const [prsError, setPrsError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === "issues" && issues === null && !issuesLoading) {
      setIssuesLoading(true)
      fetch(`/api/github/issues?owner=${owner}&repo=${repo}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? "Failed to fetch issues")
          }
          return res.json()
        })
        .then((data) => {
          setIssues(data)
          setIssuesError(null)
        })
        .catch((err) => setIssuesError(err.message))
        .finally(() => setIssuesLoading(false))
    }
  }, [activeTab, issues, issuesLoading, owner, repo])

  useEffect(() => {
    if (activeTab === "prs" && prs === null && !prsLoading) {
      setPrsLoading(true)
      fetch(`/api/github/prs?owner=${owner}&repo=${repo}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? "Failed to fetch PRs")
          }
          return res.json()
        })
        .then((data) => {
          setPrs(data)
          setPrsError(null)
        })
        .catch((err) => setPrsError(err.message))
        .finally(() => setPrsLoading(false))
    }
  }, [activeTab, prs, prsLoading, owner, repo])

  const switchTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => switchTab("issues")}
          className="font-data text-xs uppercase tracking-widest px-4 py-2"
          style={{
            color: activeTab === "issues" ? "var(--text-pri)" : "var(--text-ter)",
            borderBottom: activeTab === "issues" ? "2px solid var(--accent)" : "2px solid transparent",
            background: "transparent",
          }}
        >
          Issues
        </button>
        <button
          onClick={() => switchTab("prs")}
          className="font-data text-xs uppercase tracking-widest px-4 py-2"
          style={{
            color: activeTab === "prs" ? "var(--text-pri)" : "var(--text-ter)",
            borderBottom: activeTab === "prs" ? "2px solid var(--accent)" : "2px solid transparent",
            background: "transparent",
          }}
        >
          PRs
        </button>
      </div>

      {activeTab === "issues" && (
        <div className="space-y-4">
          {issuesLoading && (
            <p className="font-data text-sm cursor-blink" style={{ color: "var(--text-ter)" }}>
              $ loading issues...
            </p>
          )}
          {issuesError && (
            <p className="font-data text-sm" style={{ color: "var(--red)" }}>
              $ error: {issuesError}
            </p>
          )}
          {!issuesLoading && !issuesError && issues && issues.length === 0 && (
            <p className="font-data text-sm" style={{ color: "var(--text-ter)" }}>
              $ no open issues
            </p>
          )}
          {issues?.map((issue) => (
            <IssueCard
              key={issue.number}
              issue={issue}
              run={runsMap[issue.number.toString()] ?? null}
              owner={owner}
              repo={repo}
            />
          ))}
        </div>
      )}

      {activeTab === "prs" && (
        <div className="space-y-4">
          {prsLoading && (
            <p className="font-data text-sm cursor-blink" style={{ color: "var(--text-ter)" }}>
              $ loading prs...
            </p>
          )}
          {prsError && (
            <p className="font-data text-sm" style={{ color: "var(--red)" }}>
              $ error: {prsError}
            </p>
          )}
          {!prsLoading && !prsError && prs && prs.length === 0 && (
            <p className="font-data text-sm" style={{ color: "var(--text-ter)" }}>
              $ no open prs
            </p>
          )}
          {prs?.map((pr) => (
            <PrCard
              key={pr.number}
              pr={pr}
              isDroidCreated={pr.user.login === DROID_BOT_USERNAME}
              owner={owner}
              repo={repo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
