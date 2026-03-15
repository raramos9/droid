import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getEnrolledRepos, getRepoConfigOverrides, updateRepoConfigOverrides } from "@/lib/queries"

const MAX_OVERRIDES_BYTES = 20 * 1024

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const installedBy = session.user.name ?? session.user.email ?? ""
  if (!installedBy) {
    return NextResponse.json({ error: "Unable to determine user identity" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  try {
    const enrolled = await getEnrolledRepos(installedBy)
    if (!enrolled.some((r) => r.owner === owner && r.repo === repo)) {
      return NextResponse.json({ error: "Repository not enrolled" }, { status: 403 })
    }

    const overrides = await getRepoConfigOverrides(owner, repo)
    return NextResponse.json({ overrides })
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

  const installedBy = session.user.name ?? session.user.email ?? ""
  if (!installedBy) {
    return NextResponse.json({ error: "Unable to determine user identity" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { owner, repo, overrides } = body as Record<string, unknown>

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  if (typeof overrides !== "string") {
    return NextResponse.json({ error: "overrides must be a string" }, { status: 400 })
  }

  if (Buffer.byteLength(overrides, "utf8") > MAX_OVERRIDES_BYTES) {
    return NextResponse.json({ error: "overrides exceeds 20KB limit" }, { status: 400 })
  }

  try {
    const enrolled = await getEnrolledRepos(installedBy)
    if (!enrolled.some((r) => r.owner === owner && r.repo === repo)) {
      return NextResponse.json({ error: "Repository not enrolled" }, { status: 403 })
    }

    await updateRepoConfigOverrides(owner as string, repo as string, overrides, installedBy)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
