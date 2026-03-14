import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEnrolledRepos } from "@/lib/queries"
import { DashboardClient } from "./DashboardClient"
import { AppHeader } from "@/components/AppHeader"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const installedBy = session.user.name ?? session.user.email ?? ""
  const repos = await getEnrolledRepos(installedBy)

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <AppHeader user={session.user.name} />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
        >
          Repositories
        </h2>

        <DashboardClient enrolledRepos={repos} />
      </div>
    </main>
  )
}
