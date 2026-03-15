import { render, screen, fireEvent } from "@testing-library/react"
import { IssueListHeader } from "./IssueListHeader"

const defaultProps = {
  activeState: "open" as const,
  onStateChange: jest.fn(),
  authors: ["alice", "bob"],
  selectedAuthor: null as string | null,
  onAuthorChange: jest.fn(),
  labels: ["bug", "feature"],
  selectedLabel: null as string | null,
  onLabelChange: jest.fn(),
  showLabels: false,
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("IssueListHeader", () => {
  it("renders Open button", () => {
    render(<IssueListHeader {...defaultProps} />)
    expect(screen.getByRole("button", { name: /open/i })).toBeInTheDocument()
  })

  it("renders Closed button", () => {
    render(<IssueListHeader {...defaultProps} />)
    expect(screen.getByRole("button", { name: /closed/i })).toBeInTheDocument()
  })

  it("active state button has font-weight 600", () => {
    render(<IssueListHeader {...defaultProps} activeState="open" />)
    const openBtn = screen.getByRole("button", { name: /open/i })
    expect(openBtn.style.fontWeight).toBe("600")
  })

  it("inactive state button has font-weight 400", () => {
    render(<IssueListHeader {...defaultProps} activeState="open" />)
    const closedBtn = screen.getByRole("button", { name: /closed/i })
    expect(closedBtn.style.fontWeight).toBe("400")
  })

  it("clicking Closed calls onStateChange with closed", () => {
    const onStateChange = jest.fn()
    render(<IssueListHeader {...defaultProps} onStateChange={onStateChange} />)
    fireEvent.click(screen.getByRole("button", { name: /closed/i }))
    expect(onStateChange).toHaveBeenCalledWith("closed")
  })

  it("clicking Open calls onStateChange with open", () => {
    const onStateChange = jest.fn()
    render(<IssueListHeader {...defaultProps} activeState="closed" onStateChange={onStateChange} />)
    fireEvent.click(screen.getByRole("button", { name: /open/i }))
    expect(onStateChange).toHaveBeenCalledWith("open")
  })

  it("author select renders with placeholder option", () => {
    render(<IssueListHeader {...defaultProps} />)
    const select = screen.getByDisplayValue("Author")
    expect(select).toBeInTheDocument()
  })

  it("author select renders author options", () => {
    render(<IssueListHeader {...defaultProps} />)
    expect(screen.getByRole("option", { name: "alice" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "bob" })).toBeInTheDocument()
  })

  it("changing author select calls onAuthorChange", () => {
    const onAuthorChange = jest.fn()
    render(<IssueListHeader {...defaultProps} onAuthorChange={onAuthorChange} />)
    fireEvent.change(screen.getByDisplayValue("Author"), { target: { value: "alice" } })
    expect(onAuthorChange).toHaveBeenCalledWith("alice")
  })

  it("changing author select to empty calls onAuthorChange with null", () => {
    const onAuthorChange = jest.fn()
    render(<IssueListHeader {...defaultProps} selectedAuthor="alice" onAuthorChange={onAuthorChange} />)
    const select = screen.getByDisplayValue("alice")
    fireEvent.change(select, { target: { value: "" } })
    expect(onAuthorChange).toHaveBeenCalledWith(null)
  })

  it("labels select not rendered when showLabels is false", () => {
    render(<IssueListHeader {...defaultProps} showLabels={false} />)
    expect(screen.queryByDisplayValue("Label")).not.toBeInTheDocument()
  })

  it("labels select rendered when showLabels is true", () => {
    render(<IssueListHeader {...defaultProps} showLabels={true} />)
    expect(screen.getByDisplayValue("Label")).toBeInTheDocument()
  })

  it("changing label select calls onLabelChange", () => {
    const onLabelChange = jest.fn()
    render(<IssueListHeader {...defaultProps} showLabels={true} onLabelChange={onLabelChange} />)
    fireEvent.change(screen.getByDisplayValue("Label"), { target: { value: "bug" } })
    expect(onLabelChange).toHaveBeenCalledWith("bug")
  })
})
