import { render, screen } from "@testing-library/react"
import { RunStatusBadge } from "./RunStatusBadge"

describe("RunStatusBadge", () => {
  it("renders pending status", () => {
    render(<RunStatusBadge status="pending" />)
    expect(screen.getByText("pending")).toBeInTheDocument()
  })

  it("renders running status", () => {
    render(<RunStatusBadge status="running" />)
    expect(screen.getByText("running")).toBeInTheDocument()
  })

  it("renders completed status", () => {
    render(<RunStatusBadge status="completed" />)
    expect(screen.getByText("completed")).toBeInTheDocument()
  })

  it("renders failed status", () => {
    render(<RunStatusBadge status="failed" />)
    expect(screen.getByText("failed")).toBeInTheDocument()
  })

  it("renders paused status", () => {
    render(<RunStatusBadge status="paused" />)
    expect(screen.getByText("paused")).toBeInTheDocument()
  })

  it("applies distinct class for each status", () => {
    const { container: c1 } = render(<RunStatusBadge status="completed" />)
    const { container: c2 } = render(<RunStatusBadge status="failed" />)
    expect(c1.firstChild).not.toHaveClass(
      (c2.firstChild as HTMLElement).className
    )
  })

  it("renders a dot indicator alongside the label", () => {
    const { container } = render(<RunStatusBadge status="running" />)
    const dot = container.querySelector("[data-dot]")
    expect(dot).toBeInTheDocument()
  })
})

describe("RunStatusBadge iterationLimitReached", () => {
  it("shows 'limit reached' text when completed and iterationLimitReached is true", () => {
    render(<RunStatusBadge status="completed" iterationLimitReached />)
    expect(screen.getByText("limit reached")).toBeInTheDocument()
  })

  it("shows 'completed' text when completed and iterationLimitReached is false", () => {
    render(<RunStatusBadge status="completed" iterationLimitReached={false} />)
    expect(screen.getByText("completed")).toBeInTheDocument()
  })

  it("shows 'completed' text when completed and iterationLimitReached is omitted", () => {
    render(<RunStatusBadge status="completed" />)
    expect(screen.getByText("completed")).toBeInTheDocument()
  })

  it("ignores iterationLimitReached for non-completed statuses", () => {
    render(<RunStatusBadge status="failed" iterationLimitReached />)
    expect(screen.getByText("failed")).toBeInTheDocument()
    expect(screen.queryByText("limit reached")).not.toBeInTheDocument()
  })

  it("uses warning color for limit reached badge", () => {
    const { container } = render(<RunStatusBadge status="completed" iterationLimitReached />)
    const badge = container.firstChild as HTMLElement
    expect(badge.style.color).toContain("warning")
  })
})
