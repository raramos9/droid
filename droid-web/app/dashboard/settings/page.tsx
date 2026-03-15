import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserConfig } from "@/lib/queries"
import { TopBar } from "@/components/layout/TopBar"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const userId = session.user.name ?? session.user.email ?? ""
  const config = userId ? await getUserConfig(userId) : null

  return (
    <>
      <TopBar crumbs={[{ label: "Settings" }]} />
      <SettingsClient initialConfigText={config?.config_text ?? null} />
    </>
  )
}
