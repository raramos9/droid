import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunForIssue, getPendingActions } from "@/lib/queries"
import { parseIssueNumber } from "@/lib/parse-issue-number"
import { ActivityLog } from "@/components/ActivityLog"
import { PendingActionPanel } from "@/components/PendingActionPanel"
import { RunStatusBadge } from "@/components/RunStatusBadge"
import { AppHeader } from "@/components/AppHeader"
import Link from "next/link"

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
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <AppHeader
        crumbs={[
          { label: `${owner}/${repo}`, href: `/dashboard/${owner}/${repo}` },
          { label: `issue #${number}` },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {!run ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
          >
            No agent run found for issue #{number}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <h2
                className="text-2xl font-semibold"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
              >
                {run.goal?.context?.title ?? `Issue #${number}`}
              </h2>
              <RunStatusBadge status={run.status} />
            </div>

            <IssueDetailContent run={run} owner={owner} repo={repo} issueNumber={issueNumber} />
          </>
        )}
      </div>
    </main>
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
    <div className="space-y-8">
      {pendingActions.length > 0 && (
        <section className="space-y-3">
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
          >
            Pending approval
          </h3>
          {pendingActions.map((action) => (
            <PendingActionPanel key={action.id} action={action} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
        >
          Activity log
        </h3>
        <ActivityLog messages={run.messages} />
      </section>

      <section className="text-xs space-y-1 font-mono" style={{ color: "var(--text-tertiary)" }}>
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
