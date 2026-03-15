import { render, screen, fireEvent } from "@testing-library/react"
import { CommandPalette } from "./CommandPalette"
import type { CommandAction } from "./command-actions"

const actions: CommandAction[] = [
  { id: "a1", label: "Go to Dashboard", section: "Navigation", onSelect: jest.fn() },
  { id: "a2", label: "Go to Inbox", section: "Navigation", onSelect: jest.fn() },
  { id: "a3", label: "frontend", section: "Repositories", onSelect: jest.fn() },
]

const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

describe("CommandPalette", () => {
  it("renders search input when open", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("does not render content when closed", () => {
    render(<CommandPalette open={false} onClose={onClose} actions={actions} />)
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("shows all actions initially", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument()
    expect(screen.getByText("frontend")).toBeInTheDocument()
  })

  it("filters actions as user types", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "inbox" } })
    expect(screen.getByText("Go to Inbox")).toBeInTheDocument()
    expect(screen.queryByText("frontend")).not.toBeInTheDocument()
  })

  it("calls onSelect and onClose when an action is clicked", () => {
    const onSelect = jest.fn()
    const testActions: CommandAction[] = [
      { id: "a1", label: "Go to Dashboard", section: "Navigation", onSelect },
    ]
    render(<CommandPalette open={true} onClose={onClose} actions={testActions} />)
    fireEvent.click(screen.getByText("Go to Dashboard"))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose on Escape key", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("shows section headers", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    expect(screen.getByText("Navigation")).toBeInTheDocument()
    expect(screen.getByText("Repositories")).toBeInTheDocument()
  })

  it("shows empty state when no actions match", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzznomatch" } })
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it("calls onClose when backdrop is clicked", () => {
    render(<CommandPalette open={true} onClose={onClose} actions={actions} />)
    const backdrop = screen.getByRole("dialog").parentElement
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
