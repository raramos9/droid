import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAllPendingActionsWithContext } from "@/lib/queries"
import { TopBar } from "@/components/layout/TopBar"
import { InboxQueue } from "@/components/inbox/InboxQueue"

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const installedBy = session.user.name ?? session.user.email ?? ""
  const actions = await getAllPendingActionsWithContext(installedBy)

  return (
    <>
      <TopBar crumbs={[{ label: "Inbox" }]} />
      <div style={{ padding: "32px 24px", maxWidth: 720, width: "100%" }}>
        <InboxQueue actions={actions} />
      </div>
    </>
  )
}
