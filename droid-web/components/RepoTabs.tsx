"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { AgentRun, GitHubIssue, GitHubPR } from "@/lib/types"
import { IssueCard } from "./IssueCard"
import { PrCard } from "./PrCard"
import { useKeyboardNavigation } from "@/lib/hooks/useKeyboardNavigation"

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
      const q = new URLSearchParams({ owner, repo }).toString()
      fetch(`/api/github/issues?${q}`)
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
      const q = new URLSearchParams({ owner, repo }).toString()
      fetch(`/api/github/prs?${q}`)
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

  const issueItems = issues ?? []
  const prItems = prs ?? []

  const { selectedIndex: issueSelectedIndex } = useKeyboardNavigation({
    items: activeTab === "issues" ? issueItems : [],
    onSelect: (issue) => {
      router.push(`/dashboard/${owner}/${repo}/issues/${issue.number}`)
    },
  })

  const { selectedIndex: prSelectedIndex } = useKeyboardNavigation({
    items: activeTab === "prs" ? prItems : [],
    onSelect: (pr) => {
      window.open(pr.html_url, "_blank", "noopener,noreferrer")
    },
  })

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
        {(["issues", "prs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            style={{
              padding: "8px 16px",
              fontSize: "0.8rem",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: activeTab === tab
                ? "2px solid var(--text-primary)"
                : "2px solid transparent",
              background: "transparent",
              fontFamily: "var(--font-sans)",
              fontWeight: activeTab === tab ? 500 : 400,
              cursor: "pointer",
            }}
          >
            {tab === "prs" ? "Pull Requests" : "Issues"}
          </button>
        ))}
      </div>

      {/* Issues tab */}
      {activeTab === "issues" && (
        <div>
          {issuesLoading && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", padding: "16px 14px" }}>
              Loading issues...
            </p>
          )}
          {issuesError && (
            <p style={{ fontSize: "0.8rem", color: "var(--status-error)", fontFamily: "var(--font-sans)", padding: "16px 14px" }}>
              {issuesError}
            </p>
          )}
          {!issuesLoading && !issuesError && issues && issues.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", padding: "16px 14px" }}>
              No open issues
            </p>
          )}
          {issueItems.map((issue, i) => (
            <div
              key={issue.number}
              style={{
                background: issueSelectedIndex === i ? "var(--selection-bg)" : "transparent",
                borderLeft: issueSelectedIndex === i ? "2px solid var(--border-strong)" : "2px solid transparent",
                transition: "background var(--transition)",
              }}
            >
              <IssueCard
                issue={issue}
                run={runsMap[issue.number.toString()] ?? null}
                owner={owner}
                repo={repo}
              />
            </div>
          ))}
        </div>
      )}

      {/* PRs tab */}
      {activeTab === "prs" && (
        <div>
          {prsLoading && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", padding: "16px 14px" }}>
              Loading pull requests...
            </p>
          )}
          {prsError && (
            <p style={{ fontSize: "0.8rem", color: "var(--status-error)", fontFamily: "var(--font-sans)", padding: "16px 14px" }}>
              {prsError}
            </p>
          )}
          {!prsLoading && !prsError && prs && prs.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", padding: "16px 14px" }}>
              No open pull requests
            </p>
          )}
          {prItems.map((pr, i) => (
            <div
              key={pr.number}
              style={{
                background: prSelectedIndex === i ? "var(--selection-bg)" : "transparent",
                borderLeft: prSelectedIndex === i ? "2px solid var(--border-strong)" : "2px solid transparent",
                transition: "background var(--transition)",
              }}
            >
              <PrCard
                pr={pr}
                isDroidCreated={pr.user.login === DROID_BOT_USERNAME}
                owner={owner}
                repo={repo}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
