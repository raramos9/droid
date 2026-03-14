import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RepoTabs } from "./RepoTabs"
import type { AgentRun } from "@/lib/types"

// Mock next/navigation
const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
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
    // Issues tab should be active by default
    const issuesButton = screen.getByRole("button", { name: /issues/i })
    expect(issuesButton).toBeInTheDocument()
  })

  it("fetches and renders issues", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          number: 42,
          title: "Fix bug",
          user: { login: "testuser" },
          created_at: "2026-03-01T00:00:00Z",
          html_url: "https://github.com/acme/api/issues/42",
          labels: [],
          state: "open",
        },
      ]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={runsMap} />)

    await waitFor(() => {
      expect(screen.getByText("#42")).toBeInTheDocument()
      expect(screen.getByText("Fix bug")).toBeInTheDocument()
    })
  })

  it("shows empty state when no issues", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText(/no open issues/i)).toBeInTheDocument()
    })
  })

  it("switches to PRs tab via router push", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    // Wait for issues tab to load first
    await waitFor(() => {
      expect(screen.getByText(/no open issues/i)).toBeInTheDocument()
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
      expect(screen.getByText(/no open pull requests/i)).toBeInTheDocument()
    })
  })

  it("renders PRs with droid badge for bot-created PRs", async () => {
    mockGet.mockReturnValue("prs")
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          number: 5,
          title: "Auto fix",
          user: { login: "getdroid[bot]" },
          created_at: "2026-03-01T00:00:00Z",
          html_url: "https://github.com/acme/api/pull/5",
          head: { ref: "fix-branch", sha: "abc" },
          base: { ref: "main" },
          state: "open",
          draft: false,
        },
      ]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={{}} />)

    await waitFor(() => {
      expect(screen.getByText("#5")).toBeInTheDocument()
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

  it("cross-references issues with runsMap", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          number: 42,
          title: "Fix bug",
          user: { login: "testuser" },
          created_at: "2026-03-01T00:00:00Z",
          html_url: "https://github.com/acme/api/issues/42",
          labels: [],
          state: "open",
        },
      ]),
    })

    render(<RepoTabs owner="acme" repo="api" runsMap={runsMap} />)

    await waitFor(() => {
      expect(screen.getByText("Droid responded")).toBeInTheDocument()
    })
  })
})
