"use client"

import { useState, useEffect, useRef } from "react"

interface Options<T> {
  items: T[]
  onSelect: (item: T) => void
}

export function useKeyboardNavigation<T>({ items, onSelect }: Options<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const itemsRef = useRef(items)
  const onSelectRef = useRef(onSelect)

  // Keep refs current without triggering handler re-attachment
  itemsRef.current = items
  onSelectRef.current = onSelect

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea") return

      const len = itemsRef.current.length
      switch (e.key) {
        case "j":
          setSelectedIndex((prev) => (prev < len - 1 ? prev + 1 : prev))
          break
        case "k":
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev === 0 ? -1 : -1))
          break
        case "Enter":
          setSelectedIndex((prev) => {
            if (prev >= 0 && prev < len) {
              onSelectRef.current(itemsRef.current[prev])
            }
            return prev
          })
          break
        case "Escape":
          setSelectedIndex(-1)
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, []) // stable — reads latest values via refs

  return { selectedIndex }
}
