import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEnrolledRepos } from "@/lib/queries"
import { DashboardClient } from "./DashboardClient"
import { TopBar } from "@/components/layout/TopBar"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const installedBy = session.user.name ?? session.user.email ?? ""
  const repos = await getEnrolledRepos(installedBy)

  return (
    <>
      <TopBar />
      <div style={{ padding: "32px 24px", maxWidth: 720, width: "100%" }}>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
            marginBottom: 16,
          }}
        >
          Repositories
        </p>
        <DashboardClient enrolledRepos={repos} />
      </div>
    </>
  )
}
