import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getRunsMapByIssueNumber, getRepoConfigOverrides, getEnrolledRepos } from "@/lib/queries"
import { RepoTabs } from "@/components/RepoTabs"
import { TopBar } from "@/components/layout/TopBar"
import { RepoConfigSection } from "@/components/RepoConfigSection"
import type { AgentRun } from "@/lib/types"

interface Props {
  params: Promise<{ owner: string; repo: string }>
}

export default async function RepoDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const { owner, repo } = await params
  const installedBy = session.user.name ?? session.user.email ?? ""
  const enrolled = installedBy ? await getEnrolledRepos(installedBy) : []
  const ownsRepo = enrolled.some((r) => r.owner === owner && r.repo === repo)

  const [runsMapData, configOverrides] = await Promise.all([
    getRunsMapByIssueNumber(owner, repo),
    ownsRepo ? getRepoConfigOverrides(owner, repo).catch(() => null) : Promise.resolve(null),
  ])

  const runsMap: Record<string, AgentRun> = Object.fromEntries(
    Array.from(runsMapData.entries()).map(([k, v]) => [k.toString(), v])
  )

  return (
    <>
      <TopBar crumbs={[{ label: `${owner}/${repo}` }]} />
      <div style={{ padding: "32px 24px", maxWidth: 720, width: "100%" }}>
        <RepoTabs owner={owner} repo={repo} runsMap={runsMap} />
        <div style={{ marginTop: 32 }}>
          <RepoConfigSection owner={owner} repo={repo} initialOverrides={configOverrides} />
        </div>
      </div>
    </>
  )
}
