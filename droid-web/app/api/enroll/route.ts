import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"
import { supabase } from "@/lib/supabase"
import { mapSupabaseError } from "@/lib/error-messages"
import { upsertUserToken } from "@/lib/tokenStore"

const WORKER_URL = process.env.DROID_WORKER_URL ?? "http://localhost:8787"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { owner, repo } = body

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  try {
    const octokit = new Octokit({ auth: session.accessToken })

    const { data: repoData } = await octokit.repos.get({ owner, repo })
    const isOwner = repoData.owner?.login === session.login
    const isAdmin = (repoData.permissions as { admin?: boolean } | undefined)?.admin === true

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You do not have permission to enroll this repository" },
        { status: 403 }
      )
    }

    const { data: webhook } = await octokit.repos.createWebhook({
      owner,
      repo,
      config: {
        url: `${WORKER_URL}/webhook`,
        content_type: "json",
        secret: process.env.WEBHOOK_SECRET,
      },
      events: ["push", "issues", "issue_comment", "pull_request"],
      active: true,
    })

    const { error } = await supabase
      .from("enrolled_repos")
      .insert({
        owner,
        repo,
        webhook_id: webhook.id,
        installed_by: session.login ?? "unknown",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: mapSupabaseError(error) }, { status: 500 })
    }

    if (session.login && session.accessToken) {
      try {
        await upsertUserToken(session.login, session.accessToken)
      } catch (err) {
        console.error("Failed to store user token on enroll:", (err as Error).message)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
