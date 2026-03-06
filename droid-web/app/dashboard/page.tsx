import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEnrolledRepos } from "@/lib/queries"
import Link from "next/link"
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

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">Enrolled repositories</h2>
          <DashboardClient />
        </div>

        {repos.length === 0 ? (
          <p className="text-sm text-zinc-500">No repositories enrolled yet. Enroll one to get started.</p>
        ) : (
          <ul className="space-y-2">
            {repos.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/${r.owner}/${r.repo}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-800">
                    {r.owner}/{r.repo}
                  </span>
                  <span className="text-xs text-zinc-400">view activity &rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
