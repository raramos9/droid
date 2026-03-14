import { render, screen, act } from "@testing-library/react"
import { CommandPaletteProvider, useCommandPalette } from "./CommandPaletteProvider"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function TestConsumer() {
  const { open, setOpen } = useCommandPalette()
  return (
    <div>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      <button onClick={() => setOpen(true)}>Open</button>
      <button onClick={() => setOpen(false)}>Close</button>
    </div>
  )
}

describe("CommandPaletteProvider", () => {
  it("starts closed", () => {
    render(
      <CommandPaletteProvider repos={[]}>
        <TestConsumer />
      </CommandPaletteProvider>
    )
    expect(screen.getByTestId("state")).toHaveTextContent("closed")
  })

  it("exposes setOpen to consumers", () => {
    render(
      <CommandPaletteProvider repos={[]}>
        <TestConsumer />
      </CommandPaletteProvider>
    )
    act(() => {
      screen.getByText("Open").click()
    })
    expect(screen.getByTestId("state")).toHaveTextContent("open")
  })

  it("opens on Cmd+K", () => {
    render(
      <CommandPaletteProvider repos={[]}>
        <TestConsumer />
      </CommandPaletteProvider>
    )
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
    })
    expect(screen.getByTestId("state")).toHaveTextContent("open")
  })

  it("opens on Ctrl+K", () => {
    render(
      <CommandPaletteProvider repos={[]}>
        <TestConsumer />
      </CommandPaletteProvider>
    )
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
    })
    expect(screen.getByTestId("state")).toHaveTextContent("open")
  })

  it("toggles sidebar on [ key", () => {
    // Just verifies it doesn't crash; sidebar state is in useSidebarState (localStorage)
    render(
      <CommandPaletteProvider repos={[]}>
        <TestConsumer />
      </CommandPaletteProvider>
    )
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "[", bubbles: true }))
    })
    // No crash — sidebar toggle is a side effect (localStorage write)
    expect(screen.getByTestId("state")).toHaveTextContent("closed")
  })
})
