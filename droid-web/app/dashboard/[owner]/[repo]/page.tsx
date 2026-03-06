import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunsForRepo } from "@/lib/queries"
import { RunStatusBadge } from "@/components/RunStatusBadge"
import Link from "next/link"

interface Props {
  params: Promise<{ owner: string; repo: string }>
}

export default async function RepoDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const { owner, repo } = await params
  const runs = await getRunsForRepo(owner, repo)

  // Group by issueNumber, keep latest run per issue
  const latestByIssue = new Map<number | string, (typeof runs)[number]>()
  for (const run of runs) {
    const issueNumber = run.goal?.context?.issueNumber ?? run.run_id
    if (!latestByIssue.has(issueNumber)) {
      latestByIssue.set(issueNumber, run)
    }
  }
  const grouped = Array.from(latestByIssue.values())

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <nav className="text-sm text-zinc-500 space-x-1">
          <Link href="/dashboard" className="hover:text-zinc-800">dashboard</Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">{owner}/{repo}</span>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold text-zinc-900">Activity</h2>

        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-500">No agent runs yet for this repository.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4">Issue</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Iterations</th>
                <th className="pb-2">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {grouped.map((run) => {
                const issueNumber = run.goal?.context?.issueNumber
                const title = run.goal?.context?.title ?? `Run ${run.run_id.slice(0, 8)}`
                return (
                  <tr key={run.run_id} className="hover:bg-zinc-50">
                    <td className="py-3 pr-4">
                      {issueNumber ? (
                        <Link
                          href={`/dashboard/${owner}/${repo}/issues/${issueNumber}`}
                          className="text-zinc-900 hover:underline font-medium"
                        >
                          #{issueNumber} {title}
                        </Link>
                      ) : (
                        <span className="text-zinc-700">{title}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{run.iteration}</td>
                    <td className="py-3 text-zinc-400">
                      {new Date(run.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
