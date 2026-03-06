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
})
