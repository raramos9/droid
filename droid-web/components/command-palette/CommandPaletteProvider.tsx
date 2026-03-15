"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { CommandPalette } from "./CommandPalette"
import { buildActions } from "./command-actions"

interface Repo {
  owner: string
  repo: string
}

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: false,
  setOpen: () => {},
  mobileSidebarOpen: false,
  setMobileSidebarOpen: () => {},
})

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

interface Props {
  repos: Repo[]
  children: React.ReactNode
}

export function CommandPaletteProvider({ repos, children }: Props) {
  const [open, setOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const router = useRouter()

  const navigate = useCallback((href: string) => {
    router.push(href)
    setOpen(false)
  }, [router])

  const actions = useMemo(() => buildActions({ repos, navigate }), [repos, navigate])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()

      // Cmd+K / Ctrl+K: open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
        return
      }

      // [ : toggle sidebar (only when not in an input)
      if (e.key === "[" && tag !== "input" && tag !== "textarea") {
        const saved = localStorage.getItem("sidebar-collapsed")
        localStorage.setItem("sidebar-collapsed", saved === "true" ? "false" : "true")
        // Trigger a storage event so useSidebarState re-reads (cross-tab support)
        window.dispatchEvent(new Event("storage"))
        return
      }

      // t: toggle theme (only when not in an input)
      if (e.key === "t" && tag !== "input" && tag !== "textarea" && !e.metaKey && !e.ctrlKey) {
        const isDark = document.documentElement.classList.contains("dark")
        if (isDark) {
          document.documentElement.classList.remove("dark")
          localStorage.setItem("theme", "light")
        } else {
          document.documentElement.classList.add("dark")
          localStorage.setItem("theme", "dark")
        }
      }
    },
    []
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, mobileSidebarOpen, setMobileSidebarOpen }}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} actions={actions} />
    </CommandPaletteContext.Provider>
  )
}
