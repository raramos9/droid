import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const owner = req.nextUrl.searchParams.get("owner")
  const repo = req.nextUrl.searchParams.get("repo")

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 30,
    })

    const issues = data.filter(
      (item: { pull_request?: unknown }) => !item.pull_request
    )

    return NextResponse.json(issues)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
