import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RepoTabs } from "./RepoTabs"
import type { AgentRun } from "@/lib/types"

// Mock next/navigation
const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet, toString: () => "" }),
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/acme/api",
}))

const mockRun: AgentRun = {
  run_id: "run-1",
  repo_owner: "acme",
  repo_name: "api",
  trigger: "issue_created",
  goal: { context: { issueNumber: 42 } },
  status: "completed",
  messages: [],
  iteration: 3,
  artifacts: [],
  error: null,
  updated_at: "2026-03-01T12:00:00Z",
}

const runsMap = { "42": mockRun }

const mockIssue = {
  number: 42,
  title: "Fix bug",
  user: { login: "testuser" },
  created_at: "2026-03-01T00:00:00Z",
  html_url: "https://github.com/acme/api/issues/42",
  labels: [{ name: "bug", color: "d73a4a" }],
  state: "open",
  comments: 2,
}

const mockIssue2 = {
  number: 43,
  title: "Add feature",
  user: { login: "otheruser" },
  created_at: "2026-03-02T00:00:00Z",
  html_url: "https://github.com/acme/api/issues/43",
  labels: [{ name: "feature", color: "0075ca" }],
  state: "open",
  comments: 0,
}

const mockPr = {
  number: 5,
  title: "Auto fix",
  user: { login: "getdroid[bot]" },
  created_at: "2026-03-01T00:00:00Z",
  html_url: "https://github.com/acme/api/pull/5",
  head: { ref: "fix-branch", sha: "abc" },
  base: { ref: "main" },
  state: "open",
  draft: false,
  comments: 0,
  labels: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockReturnValue(null)
  global.fetch = jest.fn()
})

describe("RepoTabs", () => {
  it("defaults to issues tab", () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={runsMap} />)
    const issuesButton = screen.getByRole("button", { name: /issues/i })
    expect(issuesButton).toBeInTheDocument()
  })

  it("fetches and renders issues in IssueRow", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockIssue]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={runsMap} />)

    await waitFor(() => {
      expect(screen.getByText("Fix bug")).toBeInTheDocument()
      // Verify sub-text contains author (also in filter select, so check for issue number pattern)
      expect(screen.getByText(/^#42/)).toBeInTheDocument()
    })
  })

  it("shows empty state when no issues", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("There aren't any open issues.")).toBeInTheDocument()
    })
  })

  it("switches to PRs tab via router push", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("There aren't any open issues.")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /pull requests/i }))

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("tab=prs")
    )
  })

  it("renders PRs tab content when tab param is prs", async () => {
    mockGet.mockReturnValue("prs")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("There aren't any open pull requests.")).toBeInTheDocument()
    })
  })

  it("renders PRs with droid badge for bot-created PRs", async () => {
    mockGet.mockReturnValue("prs")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockPr]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("Auto fix")).toBeInTheDocument()
      expect(screen.getByText("Droid created")).toBeInTheDocument()
    })
  })

  it("shows loading state", () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)
    expect(screen.getByText(/loading issues/i)).toBeInTheDocument()
  })

  it("shows error state on fetch failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText(/error/)).toBeInTheDocument()
    })
  })

  it("cross-references issues with runsMap to show Droid active badge", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockIssue]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={runsMap} />)

    await waitFor(() => {
      expect(screen.getByText("Droid active")).toBeInTheDocument()
    })
  })

  it("expands IssueCard inline when row is clicked", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockIssue]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("Fix bug")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Fix bug"))

    await waitFor(() => {
      expect(screen.getByText("Dispatch droid")).toBeInTheDocument()
    })
  })

  it("collapses IssueCard when same row is clicked again", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockIssue]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("Fix bug")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Fix bug"))
    await waitFor(() => {
      expect(screen.getByText("Dispatch droid")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Fix bug"))
    await waitFor(() => {
      expect(screen.queryByText("Dispatch droid")).not.toBeInTheDocument()
    })
  })

  it("fetches with state=closed when closed toggle is clicked", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("There aren't any open issues.")).toBeInTheDocument()
    })

    // Click the Closed button in IssueListHeader
    const closedButtons = screen.getAllByRole("button", { name: /closed/i })
    fireEvent.click(closedButtons[0])

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls
      const closedCall = calls.find(
        (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).includes("state=closed")
      )
      expect(closedCall).toBeTruthy()
    })
  })

  it("filters issues by selected author", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockIssue, mockIssue2]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("Fix bug")).toBeInTheDocument()
      expect(screen.getByText("Add feature")).toBeInTheDocument()
    })

    // Select author from author filter
    const authorSelect = screen.getByDisplayValue("Author")
    fireEvent.change(authorSelect, { target: { value: "testuser" } })

    expect(screen.getByText("Fix bug")).toBeInTheDocument()
    expect(screen.queryByText("Add feature")).not.toBeInTheDocument()
  })
})
