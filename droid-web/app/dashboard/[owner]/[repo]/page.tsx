import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunsForRepo } from "@/lib/queries"
import { RepoTabs } from "@/components/RepoTabs"
import { AppHeader } from "@/components/AppHeader"
import type { AgentRun } from "@/lib/types"

interface Props {
  params: Promise<{ owner: string; repo: string }>
}

export default async function RepoDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const { owner, repo } = await params
  const runs = await getRunsForRepo(owner, repo)

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
      <AppHeader
        crumbs={[{ label: `${owner}/${repo}` }]}
      />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <RepoTabs owner={owner} repo={repo} runsMap={runsMap} />
      </div>
    </main>
  )
}
