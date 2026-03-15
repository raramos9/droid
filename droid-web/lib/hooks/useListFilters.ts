"use client"

import { useState, useMemo } from "react"

interface FilterConfig<T> {
  getAuthor: (item: T) => string
  getLabels?: (item: T) => string[]
}

interface FilterResult<T> {
  filtered: T[]
  authors: string[]
  labels: string[]
  selectedAuthor: string | null
  setSelectedAuthor: (author: string | null) => void
  selectedLabel: string | null
  setSelectedLabel: (label: string | null) => void
}

export function useListFilters<T>(
  items: T[],
  config: FilterConfig<T>
): FilterResult<T> {
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  const authors = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => set.add(config.getAuthor(item)))
    return [...set].sort()
  }, [items, config])

  const labels = useMemo(() => {
    if (!config.getLabels) return []
    const set = new Set<string>()
    items.forEach((item) => {
      const itemLabels = config.getLabels!(item)
      itemLabels.forEach((label) => set.add(label))
    })
    return [...set].sort()
  }, [items, config])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (selectedAuthor !== null && config.getAuthor(item) !== selectedAuthor) {
        return false
      }
      if (selectedLabel !== null && config.getLabels) {
        const itemLabels = config.getLabels(item)
        if (!itemLabels.includes(selectedLabel)) {
          return false
        }
      }
      return true
    })
  }, [items, config, selectedAuthor, selectedLabel])

  return {
    filtered,
    authors,
    labels,
    selectedAuthor,
    setSelectedAuthor,
    selectedLabel,
    setSelectedLabel,
  }
}
