import { render, screen } from "@testing-library/react"
import { IssueEmptyState } from "./IssueEmptyState"

describe("IssueEmptyState", () => {
  it("renders correct message for open issues", () => {
    render(<IssueEmptyState type="issues" state="open" />)
    expect(screen.getByText("There aren't any open issues.")).toBeInTheDocument()
  })

  it("renders correct message for closed issues", () => {
    render(<IssueEmptyState type="issues" state="closed" />)
    expect(screen.getByText("There aren't any closed issues.")).toBeInTheDocument()
  })

  it("renders correct message for open PRs", () => {
    render(<IssueEmptyState type="prs" state="open" />)
    expect(screen.getByText("There aren't any open pull requests.")).toBeInTheDocument()
  })

  it("renders correct message for closed PRs", () => {
    render(<IssueEmptyState type="prs" state="closed" />)
    expect(screen.getByText("There aren't any closed pull requests.")).toBeInTheDocument()
  })

  it("renders an SVG icon", () => {
    const { container } = render(<IssueEmptyState type="issues" state="open" />)
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
