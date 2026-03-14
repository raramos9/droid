import { render, screen, fireEvent } from "@testing-library/react"
import { TopBar } from "./TopBar"

// Mock the command palette context
const mockSetOpen = jest.fn()
jest.mock("@/components/command-palette/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ open: false, setOpen: mockSetOpen }),
}))

beforeEach(() => {
  mockSetOpen.mockClear()
})

describe("TopBar", () => {
  it("renders the Cmd+K button", () => {
    render(<TopBar />)
    expect(screen.getByRole("button", { name: /command palette/i })).toBeInTheDocument()
  })

  it("renders without crumbs when none provided", () => {
    render(<TopBar />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("renders a single crumb as plain text (no link) when no href", () => {
    render(<TopBar crumbs={[{ label: "owner/repo" }]} />)
    expect(screen.getByText("owner/repo")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("renders a crumb with href as a link", () => {
    render(<TopBar crumbs={[{ label: "owner/repo", href: "/dashboard/owner/repo" }]} />)
    const link = screen.getByRole("link", { name: "owner/repo" })
    expect(link).toHaveAttribute("href", "/dashboard/owner/repo")
  })

  it("renders multiple crumbs with separators", () => {
    render(
      <TopBar
        crumbs={[
          { label: "owner/repo", href: "/dashboard/owner/repo" },
          { label: "issue #1" },
        ]}
      />
    )
    expect(screen.getByRole("link", { name: "owner/repo" })).toBeInTheDocument()
    expect(screen.getByText("issue #1")).toBeInTheDocument()
  })

  it("renders at topbar height", () => {
    const { container } = render(<TopBar />)
    const header = container.querySelector("header")
    expect(header).toHaveStyle({ height: "var(--topbar-height)" })
  })

  it("calls setOpen when Cmd+K button is clicked", () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole("button", { name: /command palette/i }))
    expect(mockSetOpen).toHaveBeenCalledWith(true)
  })
})
