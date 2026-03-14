import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TopBar } from "@/components/layout/TopBar"

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  return (
    <>
      <TopBar crumbs={[{ label: "Inbox" }]} />
      <div style={{ padding: "32px 24px", maxWidth: 720, width: "100%" }}>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          Inbox coming soon — Phase 5.
        </p>
      </div>
    </>
  )
}
