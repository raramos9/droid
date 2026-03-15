import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserConfig, upsertUserConfig } from "@/lib/queries"

const MAX_CONFIG_BYTES = 50 * 1024

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.name ?? session.user.email ?? ""
  if (!userId) {
    return NextResponse.json({ error: "Unable to determine user identity" }, { status: 401 })
  }

  try {
    const config = await getUserConfig(userId)
    return NextResponse.json(config)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.name ?? session.user.email ?? ""
  if (!userId) {
    return NextResponse.json({ error: "Unable to determine user identity" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { configText } = body as Record<string, unknown>

  if (typeof configText !== "string") {
    return NextResponse.json({ error: "configText must be a string" }, { status: 400 })
  }

  if (Buffer.byteLength(configText, "utf8") > MAX_CONFIG_BYTES) {
    return NextResponse.json({ error: "configText exceeds 50KB limit" }, { status: 400 })
  }

  try {
    await upsertUserConfig(userId, configText)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
