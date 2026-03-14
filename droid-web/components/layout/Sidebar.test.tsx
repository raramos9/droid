import { render, screen, fireEvent } from "@testing-library/react"
import { Sidebar } from "./Sidebar"

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

const mockSetMobileSidebarOpen = jest.fn()
let mockMobileSidebarOpen = false

jest.mock("@/components/command-palette/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({
    mobileSidebarOpen: mockMobileSidebarOpen,
    setMobileSidebarOpen: mockSetMobileSidebarOpen,
  }),
}))

// Mock sub-components so Sidebar tests stay focused on shell behavior
jest.mock("./SidebarNav", () => ({
  SidebarNav: ({ collapsed, repos, inboxCount }: { collapsed: boolean; repos: unknown[]; inboxCount: number }) => (
    <div data-testid="sidebar-nav" data-collapsed={collapsed} data-count={inboxCount}>
      {!collapsed && repos.map((r: unknown) => {
        const repo = r as { repo: string }
        return <span key={repo.repo}>{repo.repo}</span>
      })}
    </div>
  ),
}))

jest.mock("./SidebarUserMenu", () => ({
  SidebarUserMenu: ({ user, collapsed }: { user: { name?: string | null }; collapsed: boolean }) => (
    <div data-testid="sidebar-user">
      {!collapsed && <span>{user.name}</span>}
    </div>
  ),
}))

jest.mock("./SidebarKeyboardHints", () => ({
  SidebarKeyboardHints: () => <div data-testid="sidebar-hints" />,
}))

const defaultProps = {
  user: { name: "testuser", email: "test@example.com", image: null },
  repos: [
    { owner: "acme", repo: "frontend" },
    { owner: "acme", repo: "backend" },
  ],
  inboxCount: 0,
}

describe("Sidebar", () => {
  beforeEach(() => {
    mockCollapsed = false
    mockMobileSidebarOpen = false
    mockToggle.mockClear()
    mockSetMobileSidebarOpen.mockClear()
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

  it("renders SidebarNav with collapsed state", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByTestId("sidebar-nav")).toHaveAttribute("data-collapsed", "false")
  })

  it("renders SidebarNav with collapsed=true when sidebar is collapsed", () => {
    mockCollapsed = true
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByTestId("sidebar-nav")).toHaveAttribute("data-collapsed", "true")
  })

  it("renders keyboard hints when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByTestId("sidebar-hints")).toBeInTheDocument()
  })

  it("hides keyboard hints when collapsed", () => {
    mockCollapsed = true
    render(<Sidebar {...defaultProps} />)
    expect(screen.queryByTestId("sidebar-hints")).not.toBeInTheDocument()
  })

  it("passes inboxCount to SidebarNav", () => {
    render(<Sidebar {...defaultProps} inboxCount={5} />)
    expect(screen.getByTestId("sidebar-nav")).toHaveAttribute("data-count", "5")
  })

  it("shows repo names via SidebarNav when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText("frontend")).toBeInTheDocument()
    expect(screen.getByText("backend")).toBeInTheDocument()
  })

  it("renders SidebarUserMenu", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByTestId("sidebar-user")).toBeInTheDocument()
  })

  it("shows username via SidebarUserMenu when expanded", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText("testuser")).toBeInTheDocument()
  })

  it("renders aside with data-sidebar attribute", () => {
    const { container } = render(<Sidebar {...defaultProps} />)
    expect(container.querySelector("[data-sidebar]")).toBeInTheDocument()
  })

  it("renders mobile backdrop when mobileSidebarOpen is true", () => {
    mockMobileSidebarOpen = true
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByTestId("sidebar-backdrop")).toBeInTheDocument()
  })

  it("does not render mobile backdrop when mobileSidebarOpen is false", () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.queryByTestId("sidebar-backdrop")).not.toBeInTheDocument()
  })

  it("calls setMobileSidebarOpen(false) when backdrop is clicked", () => {
    mockMobileSidebarOpen = true
    render(<Sidebar {...defaultProps} />)
    fireEvent.click(screen.getByTestId("sidebar-backdrop"))
    expect(mockSetMobileSidebarOpen).toHaveBeenCalledWith(false)
  })
})
