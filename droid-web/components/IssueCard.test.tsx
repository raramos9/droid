import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { IssueCard } from "./IssueCard"
import type { GitHubIssue, AgentRun } from "@/lib/types"

const mockIssue: GitHubIssue = {
  number: 42,
  title: "Fix login bug",
  user: { login: "testuser" },
  created_at: "2026-03-01T00:00:00Z",
  html_url: "https://github.com/acme/api/issues/42",
  labels: [{ name: "bug", color: "d73a4a" }],
  state: "open",
}

const mockRun: AgentRun = {
  run_id: "run-1",
  repo_owner: "acme",
  repo_name: "api",
  trigger: "issue_created",
  goal: { context: { issueNumber: 42, title: "Fix login bug" } },
  status: "completed",
  messages: [
    { role: "assistant", content: [{ type: "text", text: "Analyzing..." }] },
  ],
  iteration: 3,
  artifacts: [],
  error: null,
  updated_at: "2026-03-01T12:00:00Z",
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ message: "Droid dispatched" }),
  })
})

describe("IssueCard", () => {
  it("renders author and date in detail section", () => {
    render(<IssueCard issue={mockIssue} run={null} owner="acme" repo="api" />)
    expect(screen.getByText(/testuser/)).toBeInTheDocument()
  })

  it("renders dispatch button", () => {
    render(<IssueCard issue={mockIssue} run={null} owner="acme" repo="api" />)
    expect(screen.getByText("Dispatch droid")).toBeInTheDocument()
  })

  it("dispatches droid on button click", async () => {
    render(<IssueCard issue={mockIssue} run={null} owner="acme" repo="api" />)
    fireEvent.click(screen.getByText("Dispatch droid"))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/dispatch",
        expect.objectContaining({
          method: "POST",
        })
      )
    })
  })

  it("shows Dispatched on success", async () => {
    render(<IssueCard issue={mockIssue} run={null} owner="acme" repo="api" />)
    fireEvent.click(screen.getByText("Dispatch droid"))

    await waitFor(() => {
      expect(screen.getByText("Dispatched")).toBeInTheDocument()
    })
  })

  it("renders ThinkingToggle when run exists", () => {
    render(<IssueCard issue={mockIssue} run={mockRun} owner="acme" repo="api" />)
    expect(screen.getByText(/Show thinking/)).toBeInTheDocument()
  })

  it("renders InlineChat", () => {
    render(<IssueCard issue={mockIssue} run={null} owner="acme" repo="api" />)
    expect(screen.getByText(/ask about this issue/i)).toBeInTheDocument()
  })

  it("fetches droid comment when run exists", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ body: "I analyzed the issue and found..." }]),
    })

    render(<IssueCard issue={mockIssue} run={mockRun} owner="acme" repo="api" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/github/issues/42/comments")
      )
    })
  })

  it("displays droid comment text when fetched", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ body: "I analyzed the issue and found the bug." }]),
    })

    render(<IssueCard issue={mockIssue} run={mockRun} owner="acme" repo="api" />)

    await waitFor(() => {
      expect(screen.getByText(/I analyzed the issue/)).toBeInTheDocument()
    })
  })

  it("does not fetch comments when run is null", () => {
    render(<IssueCard issue={mockIssue} run={null} owner="acme" repo="api" />)

    const fetchCalls = (global.fetch as jest.Mock).mock.calls
    const commentCalls = fetchCalls.filter(
      (call: unknown[]) => typeof call[0] === "string" && call[0].includes("/comments")
    )
    expect(commentCalls).toHaveLength(0)
  })
})
