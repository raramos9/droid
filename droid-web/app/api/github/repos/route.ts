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
    const owned = data.items.filter(
      (item) =>
        item.owner?.login === session.login ||
        (item.permissions as { admin?: boolean } | undefined)?.admin === true
    )
    return NextResponse.json(owned)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
