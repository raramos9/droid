"use client"

import { RepoCard } from "./RepoCard"
import type { Repo } from "@/lib/types"

interface Props {
  repos: Repo[]
  enrolledSet: Set<string>
  enrolling: string | null
  onEnroll: (repo: Repo) => void
}

export function RepoGrid({ repos, enrolledSet, enrolling, onEnroll }: Props) {
  if (repos.length === 0) {
    return (
      <div
        data-testid="repo-grid-empty"
        style={{
          padding: "32px 0",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "0.875rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        No repositories found.
      </div>
    )
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 16,
      }}
    >
      {repos.map((repo) => (
        <RepoCard
          key={repo.full_name}
          repo={repo}
          enrolled={enrolledSet.has(repo.full_name)}
          enrolling={enrolling === repo.full_name}
          onEnroll={() => onEnroll(repo)}
        />
      ))}
    </div>
  )
}
