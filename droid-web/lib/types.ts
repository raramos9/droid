export type AgentRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"

export interface AgentRun {
  run_id: string
  repo_owner: string
  repo_name: string
  trigger: string
  goal: {
    context?: {
      issueNumber?: number
      title?: string
      body?: string
    }
  }
  status: AgentRunStatus
  messages: Message[]
  iteration: number
  artifacts: Record<string, unknown>[]
  error: string | null
  updated_at: string
}

export interface Message {
  role: "user" | "assistant"
  content: MessageContent[]
}

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown }

export type PendingActionStatus = "pending" | "approved" | "rejected"

export interface PendingAction {
  id: number
  run_id: string
  tool_use_id: string
  tool: string
  args: Record<string, unknown>
  status: PendingActionStatus
  created_at: string
}

export interface EnrolledRepo {
  id: number
  owner: string
  repo: string
  webhook_id: number
  installed_by: string
  created_at: string
}
