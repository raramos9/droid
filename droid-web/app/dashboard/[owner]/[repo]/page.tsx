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
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-6 py-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="font-data text-xs flex items-center gap-2" style={{ color: "var(--text-ter)" }}>
          <Link href="/dashboard" className="transition-colors" style={{ color: "var(--text-sec)" }}
            onMouseEnter={() => {}} // hover handled via CSS
          >
            droid
          </Link>
          <span style={{ color: "var(--accent)" }}>&gt;</span>
          <span style={{ color: "var(--text-pri)" }}>{owner}/{repo}</span>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h2
          className="font-display text-sm font-medium uppercase tracking-widest"
          style={{ color: "var(--text-ter)" }}
        >
          Activity
        </h2>

        {grouped.length === 0 ? (
          <p
            className="font-data text-sm cursor-blink"
            style={{ color: "var(--text-ter)" }}
          >
            $ no agent runs yet
          </p>
        ) : (
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--accent)" }}>
                  <th
                    className="pb-2 pr-4 pt-3 text-left font-data text-xs uppercase tracking-widest"
                    style={{ color: "var(--text-ter)" }}
                  >
                    Issue
                  </th>
                  <th
                    className="pb-2 pr-4 pt-3 text-left font-data text-xs uppercase tracking-widest"
                    style={{ color: "var(--text-ter)" }}
                  >
                    Status
                  </th>
                  <th
                    className="pb-2 pr-4 pt-3 text-left font-data text-xs uppercase tracking-widest"
                    style={{ color: "var(--text-ter)" }}
                  >
                    Iter
                  </th>
                  <th
                    className="pb-2 pt-3 text-left font-data text-xs uppercase tracking-widest"
                    style={{ color: "var(--text-ter)" }}
                  >
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((run, i) => {
                  const issueNumber = run.goal?.context?.issueNumber
                  const title = run.goal?.context?.title ?? `Run ${run.run_id.slice(0, 8)}`
                  return (
                    <tr
                      key={run.run_id}
                      className="stagger-item transition-colors"
                      style={
                        {
                          "--i": i,
                          borderBottom: "1px solid var(--border)",
                        } as React.CSSProperties
                      }
                    >
                      <td className="py-3 pr-4">
                        {issueNumber ? (
                          <Link
                            href={`/dashboard/${owner}/${repo}/issues/${issueNumber}`}
                            className="font-data transition-colors hover:underline"
                            style={{ color: "var(--text-pri)" }}
                          >
                            <span style={{ color: "var(--accent)" }}>#{issueNumber}</span>{" "}
                            {title}
                          </Link>
                        ) : (
                          <span className="font-data" style={{ color: "var(--text-sec)" }}>
                            {title}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="py-3 pr-4 font-data text-xs" style={{ color: "var(--text-ter)" }}>
                        {run.iteration}
                      </td>
                      <td className="py-3 font-data text-xs" style={{ color: "var(--text-ter)" }}>
                        {new Date(run.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
