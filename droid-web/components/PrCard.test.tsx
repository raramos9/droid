import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PrCard } from "./PrCard"
import type { GitHubPR } from "@/lib/types"

const mockPr: GitHubPR = {
  number: 10,
  title: "Add feature X",
  user: { login: "testuser" },
  created_at: "2026-03-01T00:00:00Z",
  html_url: "https://github.com/acme/api/pull/10",
  head: { ref: "feature-x", sha: "abc123" },
  base: { ref: "main" },
  state: "open",
  draft: false,
}

const droidPr: GitHubPR = {
  ...mockPr,
  user: { login: "getdroid[bot]" },
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ message: "Droid dispatched" }),
  })
})

describe("PrCard", () => {
  it("renders PR number and title", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.getByText("#10")).toBeInTheDocument()
    expect(screen.getByText("Add feature X")).toBeInTheDocument()
  })

  it("renders branch info", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.getByText(/feature-x/)).toBeInTheDocument()
    expect(screen.getByText(/main/)).toBeInTheDocument()
  })

  it("shows DROID CREATED badge when isDroidCreated", () => {
    render(<PrCard pr={droidPr} isDroidCreated={true} owner="acme" repo="api" />)
    expect(screen.getByText("DROID CREATED")).toBeInTheDocument()
  })

  it("does not show badge when not droid created", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.queryByText("DROID CREATED")).not.toBeInTheDocument()
  })

  it("renders Show files button", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.getByText("Show files")).toBeInTheDocument()
  })

  it("fetches and shows files on button click", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { filename: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "+foo" },
      ]),
    })

    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    fireEvent.click(screen.getByText("Show files"))

    await waitFor(() => {
      expect(screen.getByText("src/index.ts")).toBeInTheDocument()
    })
  })

  it("renders Dispatch droid button", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.getByText("Dispatch droid")).toBeInTheDocument()
  })

  it("renders Merge button", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.getByText("Merge")).toBeInTheDocument()
  })

  it("merges PR on button click", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, sha: "merged-sha" }),
    })

    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    fireEvent.click(screen.getByText("Merge"))

    await waitFor(() => {
      expect(screen.getByText("Merged")).toBeInTheDocument()
    })
  })

  it("shows merge error", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "PR is not mergeable" }),
    })

    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    fireEvent.click(screen.getByText("Merge"))

    await waitFor(() => {
      expect(screen.getByText(/not mergeable/)).toBeInTheDocument()
    })
  })

  it("renders InlineChat", () => {
    render(<PrCard pr={mockPr} isDroidCreated={false} owner="acme" repo="api" />)
    expect(screen.getByText(/ask droid anything/)).toBeInTheDocument()
  })
})
