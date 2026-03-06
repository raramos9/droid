import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { runId, toolUseId, result } = body

  if (!runId || !toolUseId || result === undefined) {
    return NextResponse.json({ error: "runId, toolUseId, and result are required" }, { status: 400 })
  }

  if (!/^[\w-]+$/.test(runId)) {
    return NextResponse.json({ error: "Invalid runId format" }, { status: 400 })
  }

  const workerUrl = process.env.DROID_WORKER_URL ?? "http://localhost:8787"
  const resumeApiKey = process.env.RESUME_API_KEY

  try {
    const res = await fetch(`${workerUrl}/resume/${runId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resumeApiKey}`,
      },
      body: JSON.stringify({ toolUseId, result }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
