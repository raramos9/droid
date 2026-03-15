import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

const DROID_BOT_USERNAME = "getdroid[bot]"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const owner = req.nextUrl.searchParams.get("owner")
  const repo = req.nextUrl.searchParams.get("repo")

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  const { number } = await params
  const issueNumber = parseInt(number, 10)

  if (isNaN(issueNumber)) {
    return NextResponse.json({ error: "Invalid issue number" }, { status: 400 })
  }

  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const { data } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    })

    const droidComments = data.filter(
      (comment: { user?: { login?: string } | null }) =>
        comment.user?.login === DROID_BOT_USERNAME
    )

    return NextResponse.json(droidComments)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
