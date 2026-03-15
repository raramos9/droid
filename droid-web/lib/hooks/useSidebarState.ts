"use client"

import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "sidebar-collapsed"

export function useSidebarState() {
  const [collapsed, setCollapsedState] = useState(false)

  // Sync from localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "true") setCollapsedState(true)
  }, [])

  // Respond to cross-component storage events (e.g. [ shortcut via CommandPaletteProvider)
  useEffect(() => {
    const onStorage = () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      setCollapsedState(saved === "true")
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value))
    setCollapsedState(value)
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return { collapsed, toggle, setCollapsed }
}
