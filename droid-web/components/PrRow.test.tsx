import { render, screen, fireEvent } from "@testing-library/react"
import { PrRow } from "./PrRow"
import type { GitHubPR } from "@/lib/types"

const mockPr: GitHubPR = {
  number: 10,
  title: "Add feature X",
  user: { login: "testuser" },
  created_at: "2026-03-12T12:00:00Z",
  html_url: "https://github.com/acme/api/pull/10",
  head: { ref: "feature-x", sha: "abc123" },
  base: { ref: "main" },
  state: "open",
  draft: false,
  comments: 3,
  labels: [{ name: "enhancement", color: "a2eeef" }],
}

const closedPr: GitHubPR = {
  ...mockPr,
  state: "closed",
}

const draftPr: GitHubPR = {
  ...mockPr,
  draft: true,
}

const noCommentPr: GitHubPR = {
  ...mockPr,
  comments: 0,
  labels: [],
}

describe("PrRow", () => {
  it("renders PR title", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("Add feature X")).toBeInTheDocument()
  })

  it("renders PR number and author in sub-text", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText(/^#10/)).toBeInTheDocument()
    expect(screen.getByText(/testuser/)).toBeInTheDocument()
  })

  it("renders relative time in sub-text", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText(/opened/)).toBeInTheDocument()
  })

  it("renders label chips when labels are present", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("enhancement")).toBeInTheDocument()
  })

  it("renders Droid badge when isDroidCreated", () => {
    render(<PrRow pr={mockPr} isDroidCreated={true} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("Droid created")).toBeInTheDocument()
  })

  it("does not render Droid badge when not droid created", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.queryByText("Droid created")).not.toBeInTheDocument()
  })

  it("renders Draft badge when draft is true", () => {
    render(<PrRow pr={draftPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("Draft")).toBeInTheDocument()
  })

  it("does not render Draft badge when draft is false", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.queryByText("Draft")).not.toBeInTheDocument()
  })

  it("renders comment count when comments > 0", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("does not render comment icon when comments === 0", () => {
    render(<PrRow pr={noCommentPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.queryByTestId("comment-count")).not.toBeInTheDocument()
  })

  it("applies selection background when isSelected", () => {
    const { container } = render(
      <PrRow pr={mockPr} isDroidCreated={false} isSelected={true} onClick={jest.fn()} />
    )
    const row = container.firstElementChild as HTMLElement
    expect(row.style.background).toBe("var(--selection-bg)")
  })

  it("calls onClick when clicked", () => {
    const onClick = jest.fn()
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={onClick} />)
    fireEvent.click(screen.getByText("Add feature X"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders open state icon", () => {
    render(<PrRow pr={mockPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByTestId("pr-open-icon")).toBeInTheDocument()
  })

  it("renders closed state icon when state is closed", () => {
    render(<PrRow pr={closedPr} isDroidCreated={false} isSelected={false} onClick={jest.fn()} />)
    expect(screen.getByTestId("pr-closed-icon")).toBeInTheDocument()
  })
})
