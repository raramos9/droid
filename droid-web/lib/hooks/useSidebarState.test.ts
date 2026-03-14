import { renderHook, act } from "@testing-library/react"
import { useSidebarState } from "./useSidebarState"

describe("useSidebarState", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("defaults to expanded when no localStorage entry", () => {
    const { result } = renderHook(() => useSidebarState())
    expect(result.current.collapsed).toBe(false)
  })

  it("reads initial collapsed=true from localStorage", () => {
    localStorage.setItem("sidebar-collapsed", "true")
    const { result } = renderHook(() => useSidebarState())
    // After mount effect fires
    act(() => {})
    expect(result.current.collapsed).toBe(true)
  })

  it("toggle flips collapsed from false to true", () => {
    const { result } = renderHook(() => useSidebarState())
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(true)
  })

  it("toggle flips collapsed from true to false", () => {
    localStorage.setItem("sidebar-collapsed", "true")
    const { result } = renderHook(() => useSidebarState())
    act(() => {})
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(false)
  })

  it("persists collapsed=true to localStorage after toggle", () => {
    const { result } = renderHook(() => useSidebarState())
    act(() => {
      result.current.toggle()
    })
    expect(localStorage.getItem("sidebar-collapsed")).toBe("true")
  })

  it("persists collapsed=false to localStorage after toggle", () => {
    localStorage.setItem("sidebar-collapsed", "true")
    const { result } = renderHook(() => useSidebarState())
    act(() => {})
    act(() => {
      result.current.toggle()
    })
    expect(localStorage.getItem("sidebar-collapsed")).toBe("false")
  })

  it("setCollapsed sets state directly to true", () => {
    const { result } = renderHook(() => useSidebarState())
    act(() => {
      result.current.setCollapsed(true)
    })
    expect(result.current.collapsed).toBe(true)
    expect(localStorage.getItem("sidebar-collapsed")).toBe("true")
  })

  it("setCollapsed sets state directly to false", () => {
    localStorage.setItem("sidebar-collapsed", "true")
    const { result } = renderHook(() => useSidebarState())
    act(() => {
      result.current.setCollapsed(false)
    })
    expect(result.current.collapsed).toBe(false)
    expect(localStorage.getItem("sidebar-collapsed")).toBe("false")
  })
})
