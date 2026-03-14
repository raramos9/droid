import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEnrolledRepos } from "@/lib/queries"
import { Sidebar } from "@/components/layout/Sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const installedBy = session.user.name ?? session.user.email ?? ""
  const repos = await getEnrolledRepos(installedBy)

  const sidebarRepos = repos.map((r) => ({ owner: r.owner, repo: r.repo }))

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar user={session.user} repos={sidebarRepos} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {children}
      </div>
    </div>
  )
}
