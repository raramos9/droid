import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { owner, repo, pullNumber } = body

  if (!owner || !repo || !pullNumber) {
    return NextResponse.json({ error: "owner, repo, and pullNumber are required" }, { status: 400 })
  }

  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
    })

    return NextResponse.json({ ok: true, sha: data.sha })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    if (message.includes("405") || message.includes("not mergeable")) {
      return NextResponse.json({ error: "PR is not mergeable" }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
