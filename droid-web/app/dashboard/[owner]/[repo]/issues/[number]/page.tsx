import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunForIssue, getPendingActions } from "@/lib/queries"
import { parseIssueNumber } from "@/lib/parse-issue-number"
import { ActivityLog } from "@/components/ActivityLog"
import { PendingActionPanel } from "@/components/PendingActionPanel"
import { RunStatusBadge } from "@/components/RunStatusBadge"
import { TopBar } from "@/components/layout/TopBar"

interface Props {
  params: Promise<{ owner: string; repo: string; number: string }>
}

export default async function IssueDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const { owner, repo, number } = await params
  const issueNumber = parseIssueNumber(number)
  if (issueNumber === null) redirect(`/dashboard/${owner}/${repo}`)

  const run = await getRunForIssue(owner, repo, issueNumber)

  return (
    <>
      <TopBar
        crumbs={[
          { label: `${owner}/${repo}`, href: `/dashboard/${owner}/${repo}` },
          { label: `issue #${number}` },
        ]}
      />

      <div style={{ padding: "32px 24px", maxWidth: 720, width: "100%" }}>
        {!run ? (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            No agent run found for issue #{number}
          </p>
        ) : (
          <>
            {run.artifacts?.includes("iteration_limit_reached") && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--status-warning)",
                  fontFamily: "var(--font-sans)",
                  background: "var(--status-warning-bg)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 16,
                }}
              >
                Agent reached the iteration limit and may not have finished its work.
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  margin: 0,
                }}
              >
                {run.goal?.context?.title ?? `Issue #${number}`}
              </h2>
              <RunStatusBadge
                status={run.status}
                iterationLimitReached={run.artifacts?.includes("iteration_limit_reached")}
              />
            </div>

            <IssueDetailContent run={run} owner={owner} repo={repo} issueNumber={issueNumber} />
          </>
        )}
      </div>
    </>
  )
}

async function IssueDetailContent({
  run,
  owner,
  repo,
  issueNumber,
}: {
  run: Awaited<ReturnType<typeof getRunForIssue>>
  owner: string
  repo: string
  issueNumber: number
}) {
  if (!run) return null

  const pendingActions = await getPendingActions(run.run_id)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {pendingActions.length > 0 && (
        <section>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-sans)",
              marginBottom: 12,
            }}
          >
            Pending approval
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingActions.map((action) => (
              <PendingActionPanel key={action.id} action={action} />
            ))}
          </div>
        </section>
      )}

      <section>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
            marginBottom: 12,
          }}
        >
          Activity log
        </p>
        <ActivityLog messages={run.messages} />
      </section>

      <section
        style={{
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
          color: "var(--text-tertiary)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <p>run_id: <span style={{ color: "var(--text-secondary)" }}>{run.run_id}</span></p>
        <p>iterations: <span style={{ color: "var(--text-secondary)" }}>{run.iteration}</span></p>
        <p>updated: <span style={{ color: "var(--text-secondary)" }}>{new Date(run.updated_at).toLocaleString()}</span></p>
        <p>
          <a
            href={`https://github.com/${owner}/${repo}/issues/${issueNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)", textDecoration: "underline" }}
          >
            View on GitHub →
          </a>
        </p>
      </section>
    </div>
  )
}
