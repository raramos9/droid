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
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <nav className="text-sm text-zinc-500 space-x-1">
          <Link href="/dashboard" className="hover:text-zinc-800">dashboard</Link>
          <span>/</span>
          <Link href={`/dashboard/${owner}/${repo}`} className="hover:text-zinc-800">{owner}/{repo}</Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">issue #{number}</span>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {!run ? (
          <p className="text-sm text-zinc-500">No agent run found for issue #{number}.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-zinc-900">
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
    <div className="space-y-6">
      {pendingActions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Pending approval
          </h3>
          {pendingActions.map((action) => (
            <PendingActionPanel key={action.id} action={action} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Activity log
        </h3>
        <ActivityLog messages={run.messages} />
      </section>

      <section className="text-xs text-zinc-400 space-y-1">
        <p>Run ID: <code>{run.run_id}</code></p>
        <p>Iterations: {run.iteration}</p>
        <p>Last updated: {new Date(run.updated_at).toLocaleString()}</p>
        <p>
          <a
            href={`https://github.com/${owner}/${repo}/issues/${issueNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-600"
          >
            View on GitHub &rarr;
          </a>
        </p>
      </section>
    </div>
  )
}
