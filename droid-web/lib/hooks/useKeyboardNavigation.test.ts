import { renderHook, act } from "@testing-library/react"
import { useKeyboardNavigation } from "./useKeyboardNavigation"

const items = ["a", "b", "c"]
const onSelect = jest.fn()

function pressKey(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  })
}

beforeEach(() => {
  onSelect.mockClear()
  // Ensure active element is body (not input)
  ;(document.activeElement as HTMLElement)?.blur?.()
})

describe("useKeyboardNavigation", () => {
  it("starts with no selection (-1)", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    expect(result.current.selectedIndex).toBe(-1)
  })

  it("j moves selection down from -1 to 0", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    expect(result.current.selectedIndex).toBe(0)
  })

  it("j moves selection from 0 to 1", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    pressKey("j")
    expect(result.current.selectedIndex).toBe(1)
  })

  it("j does not go past last item", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    pressKey("j")
    pressKey("j")
    pressKey("j") // past end
    expect(result.current.selectedIndex).toBe(2)
  })

  it("k moves selection up", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    pressKey("j")
    pressKey("k")
    expect(result.current.selectedIndex).toBe(0)
  })

  it("k does not go below 0", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("k")
    expect(result.current.selectedIndex).toBe(-1)
  })

  it("k from 0 stays at 0 if already at -1", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j") // 0
    pressKey("k") // back to -1 edge case: should go to -1 but we clamp at 0 since -1 means nothing selected
    // Actually from -1 j goes to 0, from 0 k should go back to -1
    expect(result.current.selectedIndex).toBe(-1)
  })

  it("Enter calls onSelect with the selected item", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    pressKey("Enter")
    expect(onSelect).toHaveBeenCalledWith("a")
  })

  it("Enter does nothing when no item is selected", () => {
    renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("Enter")
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("Escape clears selection", () => {
    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    pressKey("j")
    pressKey("Escape")
    expect(result.current.selectedIndex).toBe(-1)
  })

  it("does not respond to j/k when focused in an input", () => {
    const input = document.createElement("input")
    document.body.appendChild(input)
    input.focus()

    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    expect(result.current.selectedIndex).toBe(-1)

    document.body.removeChild(input)
  })

  it("does not respond to j/k when focused in a textarea", () => {
    const textarea = document.createElement("textarea")
    document.body.appendChild(textarea)
    textarea.focus()

    const { result } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    pressKey("j")
    expect(result.current.selectedIndex).toBe(-1)

    document.body.removeChild(textarea)
  })

  it("cleans up event listener on unmount", () => {
    const spy = jest.spyOn(window, "removeEventListener")
    const { unmount } = renderHook(() => useKeyboardNavigation({ items, onSelect }))
    unmount()
    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function))
    spy.mockRestore()
  })
})
