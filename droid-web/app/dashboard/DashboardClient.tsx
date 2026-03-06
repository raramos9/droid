"use client"

import { useState } from "react"
import { EnrollModal } from "@/components/EnrollModal"

export function DashboardClient() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        Enroll repo
      </button>
      {open && <EnrollModal onClose={() => setOpen(false)} />}
    </>
  )
}
