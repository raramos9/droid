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
  artifacts: string[]
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

export interface Repo {
  full_name: string
  owner: { login: string }
  name: string
  private: boolean
  permissions?: { admin: boolean }
  pushed_at?: string
  language: string | null
  description: string | null
  fork: boolean
  parent: { full_name: string } | null
}

export interface EnrolledRepo {
  id: number
  owner: string
  repo: string
  webhook_id: number
  installed_by: string
  created_at: string
  config_overrides?: string | null
}


export interface GitHubIssue {
  number: number
  title: string
  user: { login: string }
  created_at: string
  html_url: string
  labels: Array<{ name: string; color: string }>
  state: string
  comments: number
}

export interface GitHubPR {
  number: number
  title: string
  user: { login: string }
  created_at: string
  html_url: string
  head: { ref: string; sha: string }
  base: { ref: string }
  state: string
  draft: boolean
  comments: number
  labels: Array<{ name: string; color: string }>
}

export interface GitHubPRFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

export interface PendingActionWithContext extends PendingAction {
  repo_owner: string
  repo_name: string
  issue_number?: number
  issue_title?: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface UserToken {
  github_login: string
  encrypted_token: string
  iv: string
  updated_at: string
}
