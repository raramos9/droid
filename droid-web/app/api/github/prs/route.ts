import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

const VALID_STATES = ["open", "closed", "all"] as const
type PrState = (typeof VALID_STATES)[number]

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

  const stateParam = req.nextUrl.searchParams.get("state") ?? "open"
  if (!VALID_STATES.includes(stateParam as PrState)) {
    return NextResponse.json({ error: "state must be open, closed, or all" }, { status: 400 })
  }

  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: stateParam as PrState,
      per_page: 30,
    })

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
