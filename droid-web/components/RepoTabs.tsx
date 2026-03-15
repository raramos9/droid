"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { AgentRun, GitHubIssue, GitHubPR } from "@/lib/types"
import { IssueRow } from "./IssueRow"
import { PrRow } from "./PrRow"
import { IssueCard } from "./IssueCard"
import { PrCard } from "./PrCard"
import { IssueListHeader } from "./IssueListHeader"
import { IssueEmptyState } from "./IssueEmptyState"
import { useKeyboardNavigation } from "@/lib/hooks/useKeyboardNavigation"
import { useListFilters } from "@/lib/hooks/useListFilters"

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

  const [issuesState, setIssuesState] = useState<"open" | "closed">("open")
  const [prsState, setPrsState] = useState<"open" | "closed">("open")
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(-1)
  const [selectedPrIndex, setSelectedPrIndex] = useState(-1)

  useEffect(() => {
    if (activeTab === "issues" && issues === null && !issuesLoading) {
      setIssuesLoading(true)
      const q = new URLSearchParams({ owner, repo, state: issuesState }).toString()
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
  }, [activeTab, issues, issuesLoading, owner, repo, issuesState])

  useEffect(() => {
    if (activeTab === "prs" && prs === null && !prsLoading) {
      setPrsLoading(true)
      const q = new URLSearchParams({ owner, repo, state: prsState }).toString()
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
  }, [activeTab, prs, prsLoading, owner, repo, prsState])

  const switchTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleIssuesStateChange = (state: "open" | "closed") => {
    setIssues(null)
    setIssuesState(state)
    setSelectedIssueIndex(-1)
  }

  const handlePrsStateChange = (state: "open" | "closed") => {
    setPrs(null)
    setPrsState(state)
    setSelectedPrIndex(-1)
  }

  const issueFilters = useListFilters(issues ?? [], {
    getAuthor: (issue: GitHubIssue) => issue.user.login,
    getLabels: (issue: GitHubIssue) => issue.labels.map((l) => l.name),
  })

  const prFilters = useListFilters(prs ?? [], {
    getAuthor: (pr: GitHubPR) => pr.user.login,
    getLabels: (pr: GitHubPR) => pr.labels.map((l) => l.name),
  })

  const filteredIssues = issueFilters.filtered
  const filteredPrs = prFilters.filtered

  const { selectedIndex: issueKbIndex } = useKeyboardNavigation({
    items: activeTab === "issues" ? filteredIssues : [],
    onSelect: (issue) => {
      const idx = filteredIssues.indexOf(issue)
      setSelectedIssueIndex(idx === selectedIssueIndex ? -1 : idx)
    },
  })

  const { selectedIndex: prKbIndex } = useKeyboardNavigation({
    items: activeTab === "prs" ? filteredPrs : [],
    onSelect: (pr) => {
      const idx = filteredPrs.indexOf(pr)
      setSelectedPrIndex(idx === selectedPrIndex ? -1 : idx)
    },
  })

  // Sync keyboard navigation index with selected index for visual highlight
  const activeIssueIndex = selectedIssueIndex >= 0 ? selectedIssueIndex : issueKbIndex
  const activePrIndex = selectedPrIndex >= 0 ? selectedPrIndex : prKbIndex

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
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: 16 }}>
          <IssueListHeader
            activeState={issuesState}
            onStateChange={handleIssuesStateChange}
            authors={issueFilters.authors}
            selectedAuthor={issueFilters.selectedAuthor}
            onAuthorChange={issueFilters.setSelectedAuthor}
            labels={issueFilters.labels}
            selectedLabel={issueFilters.selectedLabel}
            onLabelChange={issueFilters.setSelectedLabel}
            showLabels={true}
          />
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
          {!issuesLoading && !issuesError && issues && filteredIssues.length === 0 && (
            <IssueEmptyState type="issues" state={issuesState} />
          )}
          {filteredIssues.map((issue, i) => (
            <React.Fragment key={issue.number}>
              <IssueRow
                issue={issue}
                run={runsMap[issue.number.toString()] ?? null}
                isSelected={activeIssueIndex === i}
                onClick={() => setSelectedIssueIndex(i === selectedIssueIndex ? -1 : i)}
              />
              {selectedIssueIndex === i && (
                <IssueCard
                  issue={issue}
                  run={runsMap[issue.number.toString()] ?? null}
                  owner={owner}
                  repo={repo}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* PRs tab */}
      {activeTab === "prs" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: 16 }}>
          <IssueListHeader
            activeState={prsState}
            onStateChange={handlePrsStateChange}
            authors={prFilters.authors}
            selectedAuthor={prFilters.selectedAuthor}
            onAuthorChange={prFilters.setSelectedAuthor}
            labels={prFilters.labels}
            selectedLabel={prFilters.selectedLabel}
            onLabelChange={prFilters.setSelectedLabel}
            showLabels={true}
          />
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
          {!prsLoading && !prsError && prs && filteredPrs.length === 0 && (
            <IssueEmptyState type="prs" state={prsState} />
          )}
          {filteredPrs.map((pr, i) => (
            <React.Fragment key={pr.number}>
              <PrRow
                pr={pr}
                isDroidCreated={pr.user.login === DROID_BOT_USERNAME}
                isSelected={activePrIndex === i}
                onClick={() => setSelectedPrIndex(i === selectedPrIndex ? -1 : i)}
              />
              {selectedPrIndex === i && (
                <PrCard
                  pr={pr}
                  isDroidCreated={pr.user.login === DROID_BOT_USERNAME}
                  owner={owner}
                  repo={repo}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
