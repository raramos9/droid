"use client"

import { useState, useEffect, useCallback } from "react"

interface Options<T> {
  items: T[]
  onSelect: (item: T) => void
}

export function useKeyboardNavigation<T>({ items, onSelect }: Options<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea") return

      switch (e.key) {
        case "j":
          setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev))
          break
        case "k":
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev === 0 ? -1 : -1))
          break
        case "Enter":
          setSelectedIndex((prev) => {
            if (prev >= 0 && prev < items.length) {
              onSelect(items[prev])
            }
            return prev
          })
          break
        case "Escape":
          setSelectedIndex(-1)
          break
      }
    },
    [items, onSelect]
  )

  useEffect(() => {
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handler])

  return { selectedIndex }
}
