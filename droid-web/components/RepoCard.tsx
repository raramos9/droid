"use client"

import Link from "next/link"
import type { Repo } from "@/lib/types"

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dart: "#00B4AB",
}

function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] ?? "#8b949e"
}

interface Props {
  repo: Repo
  enrolled: boolean
  enrolling: boolean
  onEnroll: () => void
}

export function RepoCard({ repo, enrolled, enrolling, onEnroll }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface)",
      }}
    >
      {/* Header row: name + visibility */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--interactive)",
            fontFamily: "var(--font-sans)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {repo.name}
        </span>
        <span
          className="badge"
          style={{
            background: "var(--surface-raised)",
            color: "var(--text-tertiary)",
            flexShrink: 0,
            fontSize: "0.7rem",
          }}
        >
          {repo.private ? "Private" : "Public"}
        </span>
      </div>

      {/* Fork info */}
      {repo.fork && repo.parent && (
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          Forked from {repo.parent.full_name}
        </p>
      )}

      {/* Description */}
      {repo.description && (
        <p
          data-testid="repo-description"
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {repo.description}
        </p>
      )}

      {/* Footer row: language + action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          paddingTop: 4,
        }}
      >
        {/* Language */}
        {repo.language ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              data-testid="language-dot"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: getLanguageColor(repo.language),
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {repo.language}
            </span>
          </div>
        ) : (
          <span />
        )}

        {/* Enroll / enrolled */}
        {enrolled ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="badge"
              style={{
                background: "var(--status-success-bg)",
                color: "var(--status-success)",
                fontSize: "0.7rem",
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
            onClick={onEnroll}
            disabled={enrolling}
            className="btn-secondary"
            style={{ padding: "3px 10px", fontSize: "0.75rem" }}
          >
            {enrolling ? "Enrolling..." : "Enroll"}
          </button>
        )}
      </div>
    </div>
  )
}
