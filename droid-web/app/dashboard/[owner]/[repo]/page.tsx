import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunsForRepo } from "@/lib/queries"
import { RepoTabs } from "@/components/RepoTabs"
import type { AgentRun } from "@/lib/types"
import Link from "next/link"

interface Props {
  params: Promise<{ owner: string; repo: string }>
}

export default async function RepoDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const { owner, repo } = await params
  const runs = await getRunsForRepo(owner, repo)

  // Build runsMap keyed by issueNumber (as string) for client component
  const runsMap: Record<string, AgentRun> = {}
  for (const run of runs) {
    const issueNumber = run.goal?.context?.issueNumber
    const key = typeof issueNumber === "number"
      ? issueNumber.toString()
      : run.run_id
    if (!(key in runsMap)) {
      runsMap[key] = run
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-6 py-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="font-data text-xs flex items-center gap-2" style={{ color: "var(--text-ter)" }}>
          <Link href="/dashboard" className="transition-colors" style={{ color: "var(--text-sec)" }}>
            droid
          </Link>
          <span style={{ color: "var(--accent)" }}>&gt;</span>
          <span style={{ color: "var(--text-pri)" }}>{owner}/{repo}</span>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <RepoTabs owner={owner} repo={repo} runsMap={runsMap} />
      </div>
    </main>
  )
}
