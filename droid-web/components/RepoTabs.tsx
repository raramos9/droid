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
        {["issues", "prs"].map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className="text-sm px-4 py-2"
            style={{
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              borderBottom: activeTab === tab ? "2px solid var(--text-primary)" : "2px solid transparent",
              background: "transparent",
              fontFamily: "var(--font-sans)",
              fontWeight: activeTab === tab ? 500 : 400,
              textTransform: "capitalize",
            }}
          >
            {tab === "prs" ? "Pull Requests" : "Issues"}
          </button>
        ))}
      </div>

      {activeTab === "issues" && (
        <div className="space-y-0">
          {issuesLoading && (
            <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
              Loading issues...
            </p>
          )}
          {issuesError && (
            <p className="text-sm" style={{ color: "var(--status-error)", fontFamily: "var(--font-sans)" }}>
              {issuesError}
            </p>
          )}
          {!issuesLoading && !issuesError && issues && issues.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
              No open issues
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
        <div className="space-y-0">
          {prsLoading && (
            <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
              Loading pull requests...
            </p>
          )}
          {prsError && (
            <p className="text-sm" style={{ color: "var(--status-error)", fontFamily: "var(--font-sans)" }}>
              {prsError}
            </p>
          )}
          {!prsLoading && !prsError && prs && prs.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
              No open pull requests
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
