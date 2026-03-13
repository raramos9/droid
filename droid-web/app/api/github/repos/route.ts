import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { Octokit } from "@octokit/rest"

type RepoItem = { owner?: { login?: string } | null; permissions?: unknown }

function isOwnerOrAdmin(item: RepoItem, login: string | undefined): boolean {
  const perms = item.permissions as { admin?: boolean } | undefined
  return item.owner?.login === login || perms?.admin === true
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q") ?? ""
  const octokit = new Octokit({ auth: session.accessToken })

  try {
    const login = session.login ?? (await octokit.users.getAuthenticated()).data.login

    if (!q) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
        affiliation: "owner,organization_member",
      })
      return NextResponse.json(data.filter((item) => isOwnerOrAdmin(item, login)))
    }

    const { data } = await octokit.search.repos({
      q: `${q} user:@me`,
      per_page: 20,
      sort: "updated",
    })
    return NextResponse.json(data.items.filter((item) => isOwnerOrAdmin(item, login)))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
