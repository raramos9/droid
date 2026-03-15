import { renderHook, act } from "@testing-library/react"
import { useListFilters } from "./useListFilters"

interface TestItem {
  id: number
  author: string
  tags: Array<{ name: string }>
}

const items: TestItem[] = [
  { id: 1, author: "alice", tags: [{ name: "bug" }, { name: "critical" }] },
  { id: 2, author: "bob", tags: [{ name: "feature" }] },
  { id: 3, author: "alice", tags: [{ name: "feature" }, { name: "bug" }] },
  { id: 4, author: "carol", tags: [] },
]

const config = {
  getAuthor: (item: TestItem) => item.author,
  getLabels: (item: TestItem) => item.tags.map((t) => t.name),
}

describe("useListFilters", () => {
  it("returns all items when no filter selected", () => {
    const { result } = renderHook(() => useListFilters(items, config))
    expect(result.current.filtered).toHaveLength(4)
  })

  it("derives unique sorted authors", () => {
    const { result } = renderHook(() => useListFilters(items, config))
    expect(result.current.authors).toEqual(["alice", "bob", "carol"])
  })

  it("derives unique sorted labels", () => {
    const { result } = renderHook(() => useListFilters(items, config))
    expect(result.current.labels).toEqual(["bug", "critical", "feature"])
  })

  it("filters by author", () => {
    const { result } = renderHook(() => useListFilters(items, config))

    act(() => {
      result.current.setSelectedAuthor("alice")
    })

    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.map((i) => i.id)).toEqual([1, 3])
  })

  it("filters by label", () => {
    const { result } = renderHook(() => useListFilters(items, config))

    act(() => {
      result.current.setSelectedLabel("feature")
    })

    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.map((i) => i.id)).toEqual([2, 3])
  })

  it("applies AND logic when both author and label selected", () => {
    const { result } = renderHook(() => useListFilters(items, config))

    act(() => {
      result.current.setSelectedAuthor("alice")
      result.current.setSelectedLabel("bug")
    })

    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.map((i) => i.id)).toEqual([1, 3])
  })

  it("resets to all items when author cleared", () => {
    const { result } = renderHook(() => useListFilters(items, config))

    act(() => {
      result.current.setSelectedAuthor("bob")
    })
    expect(result.current.filtered).toHaveLength(1)

    act(() => {
      result.current.setSelectedAuthor(null)
    })
    expect(result.current.filtered).toHaveLength(4)
  })

  it("returns empty filtered when no items match", () => {
    const { result } = renderHook(() => useListFilters(items, config))

    act(() => {
      result.current.setSelectedAuthor("bob")
      result.current.setSelectedLabel("critical")
    })

    expect(result.current.filtered).toHaveLength(0)
  })

  it("handles empty items array", () => {
    const { result } = renderHook(() => useListFilters([], config))

    expect(result.current.filtered).toHaveLength(0)
    expect(result.current.authors).toEqual([])
    expect(result.current.labels).toEqual([])
  })

  it("works without getLabels config", () => {
    const configNoLabels = {
      getAuthor: (item: TestItem) => item.author,
    }
    const { result } = renderHook(() => useListFilters(items, configNoLabels))

    expect(result.current.labels).toEqual([])
    expect(result.current.filtered).toHaveLength(4)
  })

  it("returns new array references (immutable)", () => {
    const { result } = renderHook(() => useListFilters(items, config))
    expect(result.current.filtered).not.toBe(items)
  })
})
