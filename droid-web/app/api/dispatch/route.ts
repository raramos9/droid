import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { owner, repo, type, issueNumber, prNumber } = body

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  if (type !== "issue" && type !== "pr") {
    return NextResponse.json({ error: "type must be 'issue' or 'pr'" }, { status: 400 })
  }

  const workerUrl = process.env.DROID_WORKER_URL ?? "http://localhost:8787"
  const apiKey = process.env.DROID_RESUME_API_KEY

  try {
    const res = await fetch(`${workerUrl}/dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ owner, repo, type, issueNumber, prNumber }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
