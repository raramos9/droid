"use client"

import { useState } from "react"
import { EnrollModal } from "@/components/EnrollModal"
import type { EnrolledRepo } from "@/lib/types"

interface Props {
  enrolledRepos: EnrolledRepo[]
}

export function DashboardClient({ enrolledRepos }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        Enroll repo
      </button>
      {open && <EnrollModal onClose={() => setOpen(false)} enrolledRepos={enrolledRepos} />}
    </>
  )
}
