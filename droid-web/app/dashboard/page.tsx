import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEnrolledRepos } from "@/lib/queries"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const installedBy = session.user.name ?? session.user.email ?? ""
  const repos = await getEnrolledRepos(installedBy)

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-display text-lg font-medium" style={{ color: "var(--text-pri)" }}>
          dr<span style={{ color: "var(--accent)" }}>o</span>id
        </span>
        <span className="font-data text-xs" style={{ color: "var(--text-sec)" }}>
          {session.user.name}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h2
          className="font-display text-sm font-medium uppercase tracking-widest"
          style={{ color: "var(--text-ter)" }}
        >
          Repositories
        </h2>

        <DashboardClient enrolledRepos={repos} />
      </div>
    </main>
  )
}
