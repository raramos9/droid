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
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">droid</h1>
        <span className="text-sm text-zinc-500">{session.user.name}</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <DashboardClient enrolledRepos={repos} />
      </div>
    </main>
  )
}
