import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"
import { supabase } from "@/lib/supabase"

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
        installed_by: session.user?.name ?? session.user?.email ?? "unknown",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
