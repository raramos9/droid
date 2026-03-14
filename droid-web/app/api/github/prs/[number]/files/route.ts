import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

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
  const pullNumber = parseInt(number, 10)

  if (isNaN(pullNumber)) {
    return NextResponse.json({ error: "Invalid pull request number" }, { status: 400 })
  }

  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    })

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
