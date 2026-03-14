import { render, screen, fireEvent } from "@testing-library/react"
import { Sidebar } from "./Sidebar"

// Mock useSidebarState so we control collapsed state in tests
const mockToggle = jest.fn()
const mockSetCollapsed = jest.fn()
let mockCollapsed = false

jest.mock("@/lib/hooks/useSidebarState", () => ({
  useSidebarState: () => ({
    collapsed: mockCollapsed,
    toggle: mockToggle,
    setCollapsed: mockSetCollapsed,
  }),
}))

const defaultProps = {
  user: { name: "testuser", email: "test@example.com", image: null },
  repos: [
    { owner: "acme", repo: "frontend" },
    { owner: "acme", repo: "backend" },
  ],
}

describe("Sidebar", () => {
  beforeEach(() => {
    mockCollapsed = false
    mockToggle.mockClear()
  })

  it("renders the droid logo link when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText("droid")).toBeInTheDocument()
  })

  it("renders a toggle button with correct label when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByRole("button", { name: /collapse sidebar/i })).toBeInTheDocument()
  })

  it("renders toggle button with expand label when collapsed", () => {
    mockCollapsed = true
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument()
  })

  it("calls toggle when the collapse button is clicked", () => {
    render(<Sidebar {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }))
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it("applies narrow width when collapsed", () => {
    mockCollapsed = true
    const { container } = render(<Sidebar {...defaultProps} />)
    const aside = container.querySelector("aside")
    expect(aside).toHaveStyle({ width: "var(--sidebar-collapsed-width)" })
  })

  it("applies full width when expanded", () => {
    const { container } = render(<Sidebar {...defaultProps} />)
    const aside = container.querySelector("aside")
    expect(aside).toHaveStyle({ width: "var(--sidebar-width)" })
  })

  it("hides repo names when collapsed", () => {
    mockCollapsed = true
    render(<Sidebar {...defaultProps} />)
    expect(screen.queryByText("frontend")).not.toBeInTheDocument()
  })

  it("shows repo names when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText("frontend")).toBeInTheDocument()
    expect(screen.getByText("backend")).toBeInTheDocument()
  })

  it("shows username when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText("testuser")).toBeInTheDocument()
  })

  it("hides username text when collapsed", () => {
    mockCollapsed = true
    render(<Sidebar {...defaultProps} />)
    expect(screen.queryByText("testuser")).not.toBeInTheDocument()
  })
})
