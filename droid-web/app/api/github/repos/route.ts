import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q") ?? ""
  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const { data } = await octokit.search.repos({
      q: `${q} user:@me`,
      per_page: 20,
      sort: "updated",
    })
    return NextResponse.json(data.items)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
