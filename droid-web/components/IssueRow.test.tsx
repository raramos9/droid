import { render, screen, fireEvent } from "@testing-library/react"
import { IssueRow } from "./IssueRow"
import type { GitHubIssue, AgentRun } from "@/lib/types"

const mockIssue: GitHubIssue = {
  number: 42,
  title: "Fix login bug",
  user: { login: "testuser" },
  created_at: "2026-03-12T12:00:00Z",
  html_url: "https://github.com/acme/api/issues/42",
  labels: [
    { name: "bug", color: "d73a4a" },
    { name: "priority", color: "0075ca" },
  ],
  state: "open",
  comments: 5,
}

const closedIssue: GitHubIssue = {
  ...mockIssue,
  state: "closed",
}

const noCommentIssue: GitHubIssue = {
  ...mockIssue,
  comments: 0,
  labels: [],
}

const mockRun: AgentRun = {
  run_id: "run-1",
  repo_owner: "acme",
  repo_name: "api",
  trigger: "issue_created",
  goal: { context: { issueNumber: 42, title: "Fix login bug" } },
  status: "completed",
  messages: [],
  iteration: 3,
  artifacts: [],
  error: null,
  updated_at: "2026-03-01T12:00:00Z",
}

describe("IssueRow", () => {
  it("renders issue title", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("Fix login bug")).toBeInTheDocument()
  })

  it("renders issue number and author in sub-text", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText(/^#42/)).toBeInTheDocument()
    expect(screen.getByText(/testuser/)).toBeInTheDocument()
  })

  it("renders relative time in sub-text", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    // "opened" text should be present along with a time string
    expect(screen.getByText(/opened/)).toBeInTheDocument()
  })

  it("renders label chips when labels are present", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("bug")).toBeInTheDocument()
    expect(screen.getByText("priority")).toBeInTheDocument()
  })

  it("renders Droid badge when run is not null", () => {
    render(<IssueRow issue={mockIssue} run={mockRun} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("Droid active")).toBeInTheDocument()
  })

  it("does not render Droid badge when run is null", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.queryByText("Droid active")).not.toBeInTheDocument()
  })

  it("renders comment count when comments > 0", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("does not render comment icon when comments === 0", () => {
    render(<IssueRow issue={noCommentIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.queryByTestId("comment-count")).not.toBeInTheDocument()
  })

  it("applies selection background when isSelected", () => {
    const { container } = render(
      <IssueRow issue={mockIssue} run={null} isSelected={true} onClick={jest.fn()} />
    )
    const row = container.firstElementChild as HTMLElement
    expect(row.style.background).toBe("var(--selection-bg)")
  })

  it("calls onClick when clicked", () => {
    const onClick = jest.fn()
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={onClick} />)
    fireEvent.click(screen.getByText("Fix login bug"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders open state icon", () => {
    render(<IssueRow issue={mockIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByTestId("issue-open-icon")).toBeInTheDocument()
  })

  it("renders closed state icon when state is closed", () => {
    render(<IssueRow issue={closedIssue} run={null} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByTestId("issue-closed-icon")).toBeInTheDocument()
  })
})
