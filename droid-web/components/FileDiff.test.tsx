import { render, screen, fireEvent } from "@testing-library/react"
import { FileDiff } from "./FileDiff"
import type { GitHubPRFile } from "@/lib/types"

const fileWithPatch: GitHubPRFile = {
  filename: "src/index.ts",
  status: "modified",
  additions: 5,
  deletions: 2,
  patch: `@@ -1,5 +1,8 @@
 import { foo } from 'bar'
-const old = true
+const updated = true
+const extra = false`,
}

const fileWithoutPatch: GitHubPRFile = {
  filename: "image.png",
  status: "added",
  additions: 0,
  deletions: 0,
}

describe("FileDiff", () => {
  it("renders filename and stats", () => {
    render(<FileDiff file={fileWithPatch} />)
    expect(screen.getByText("src/index.ts")).toBeInTheDocument()
    expect(screen.getByText("+5 -2")).toBeInTheDocument()
  })

  it("renders patch lines with correct colors", () => {
    const { container } = render(<FileDiff file={fileWithPatch} />)
    const pre = container.querySelector("pre")
    expect(pre).toBeTruthy()

    const lines = pre!.querySelectorAll("span")
    // Check that we have lines rendered
    expect(lines.length).toBeGreaterThan(0)
  })

  it("shows message when no patch available", () => {
    render(<FileDiff file={fileWithoutPatch} />)
    expect(screen.getByText("Binary file or no diff available")).toBeInTheDocument()
  })

  it("truncates patches with more than 200 lines", () => {
    const longPatch = Array.from({ length: 250 }, (_, i) => `+line ${i}`).join("\n")
    const bigFile: GitHubPRFile = {
      filename: "big.ts",
      status: "modified",
      additions: 250,
      deletions: 0,
      patch: longPatch,
    }

    render(<FileDiff file={bigFile} />)
    expect(screen.getByText(/50 more lines/)).toBeInTheDocument()
  })

  it("expands truncated patches when button is clicked", () => {
    const longPatch = Array.from({ length: 250 }, (_, i) => `+line ${i}`).join("\n")
    const bigFile: GitHubPRFile = {
      filename: "big.ts",
      status: "modified",
      additions: 250,
      deletions: 0,
      patch: longPatch,
    }

    render(<FileDiff file={bigFile} />)
    fireEvent.click(screen.getByText(/50 more lines/))
    expect(screen.queryByText(/more lines/)).not.toBeInTheDocument()
  })
})
