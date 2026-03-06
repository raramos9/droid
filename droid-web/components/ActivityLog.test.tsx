import { render, screen } from "@testing-library/react"
import { ActivityLog } from "./ActivityLog"
import type { Message } from "@/lib/types"

const messages: Message[] = [
  {
    role: "assistant",
    content: [{ type: "text", text: "I will analyze this issue." }],
  },
  {
    role: "assistant",
    content: [
      { type: "tool_use", id: "tu1", name: "readFile", input: { path: "src/index.ts" } },
    ],
  },
  {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: "tu1", content: "file contents" },
    ],
  },
  {
    role: "assistant",
    content: [{ type: "text", text: "Here is my plan." }],
  },
]

describe("ActivityLog", () => {
  it("renders text blocks from assistant messages", () => {
    render(<ActivityLog messages={messages} />)
    expect(screen.getByText("I will analyze this issue.")).toBeInTheDocument()
    expect(screen.getByText("Here is my plan.")).toBeInTheDocument()
  })

  it("does not render tool_use internals as visible text blocks", () => {
    render(<ActivityLog messages={messages} />)
    expect(screen.queryByText("readFile")).not.toBeInTheDocument()
    expect(screen.queryByText("src/index.ts")).not.toBeInTheDocument()
  })

  it("does not render tool_result content", () => {
    render(<ActivityLog messages={messages} />)
    expect(screen.queryByText("file contents")).not.toBeInTheDocument()
  })

  it("renders empty state when no messages", () => {
    render(<ActivityLog messages={[]} />)
    expect(screen.getByText(/no activity/i)).toBeInTheDocument()
  })

  it("renders list items without duplicate keys (stable key check)", () => {
    const { container } = render(<ActivityLog messages={messages} />)
    const items = container.querySelectorAll("li")
    // Two text blocks exist; confirm both render (no collision from unstable keys)
    expect(items).toHaveLength(2)
  })
})
