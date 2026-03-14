import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunForIssue, getPendingActions } from "@/lib/queries"
import { parseIssueNumber } from "@/lib/parse-issue-number"
import { ActivityLog } from "@/components/ActivityLog"
import { PendingActionPanel } from "@/components/PendingActionPanel"
import { RunStatusBadge } from "@/components/RunStatusBadge"
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
      <header
        className="px-6 py-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="font-data text-xs flex items-center gap-2" style={{ color: "var(--text-ter)" }}>
          <Link href="/dashboard" style={{ color: "var(--text-sec)" }}>droid</Link>
          <span style={{ color: "var(--accent)" }}>&gt;</span>
          <Link href={`/dashboard/${owner}/${repo}`} style={{ color: "var(--text-sec)" }}>
            {owner}/{repo}
          </Link>
          <span style={{ color: "var(--accent)" }}>&gt;</span>
          <span style={{ color: "var(--text-pri)" }}>issue #{number}</span>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {!run ? (
          <p
            className="font-data text-sm cursor-blink"
            style={{ color: "var(--text-ter)" }}
          >
            $ no agent run found for issue #{number}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <h2
                className="font-display text-2xl font-medium"
                style={{ color: "var(--text-pri)" }}
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
            className="font-data text-xs uppercase tracking-widest"
            style={{
              color: "var(--text-ter)",
              paddingLeft: "8px",
              borderLeft: "2px solid var(--accent)",
            }}
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
          className="font-data text-xs uppercase tracking-widest"
          style={{
            color: "var(--text-ter)",
            paddingLeft: "8px",
            borderLeft: "2px solid var(--border)",
          }}
        >
          Activity log
        </h3>
        <ActivityLog messages={run.messages} />
      </section>

      <section className="font-data text-xs space-y-1" style={{ color: "var(--text-ter)" }}>
        <p>run_id: <span style={{ color: "var(--text-sec)" }}>{run.run_id}</span></p>
        <p>iterations: <span style={{ color: "var(--text-sec)" }}>{run.iteration}</span></p>
        <p>updated: <span style={{ color: "var(--text-sec)" }}>{new Date(run.updated_at).toLocaleString()}</span></p>
        <p>
          <a
            href={`https://github.com/${owner}/${repo}/issues/${issueNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "underline" }}
          >
            view on github &rarr;
          </a>
        </p>
      </section>
    </div>
  )
}
