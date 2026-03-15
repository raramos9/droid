import { render, screen } from "@testing-library/react"
import { SidebarKeyboardHints } from "./SidebarKeyboardHints"

describe("SidebarKeyboardHints", () => {
  it("renders keyboard shortcut labels when visible", () => {
    render(<SidebarKeyboardHints />)
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.getByText("Navigate")).toBeInTheDocument()
    expect(screen.getByText("Open")).toBeInTheDocument()
  })

  it("renders key badges including the command key", () => {
    render(<SidebarKeyboardHints />)
    // ⌘ appears exactly once (only in the ⌘K shortcut)
    expect(screen.getByText("⌘")).toBeInTheDocument()
    // All shortcuts render at least their label
    expect(screen.getByText("Approve")).toBeInTheDocument()
    expect(screen.getByText("Reject")).toBeInTheDocument()
  })
})
