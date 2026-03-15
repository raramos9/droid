import { render, screen, fireEvent } from "@testing-library/react"
import { ThinkingToggle } from "./ThinkingToggle"
import type { Message } from "@/lib/types"

const messagesWithText: Message[] = [
  {
    role: "assistant",
    content: [{ type: "text", text: "Analyzing the issue." }],
  },
  {
    role: "assistant",
    content: [
      { type: "tool_use", id: "tu1", name: "readFile", input: {} },
    ],
  },
  {
    role: "assistant",
    content: [{ type: "text", text: "Here is my plan." }],
  },
]

const messagesWithNoText: Message[] = [
  {
    role: "assistant",
    content: [
      { type: "tool_use", id: "tu1", name: "readFile", input: {} },
    ],
  },
]

describe("ThinkingToggle", () => {
  it("renders nothing when no text blocks exist", () => {
    const { container } = render(<ThinkingToggle messages={messagesWithNoText} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders nothing for empty messages", () => {
    const { container } = render(<ThinkingToggle messages={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders collapsed state by default with step count", () => {
    render(<ThinkingToggle messages={messagesWithText} />)
    expect(screen.getByText(/Show thinking \(2 steps\)/)).toBeInTheDocument()
  })

  it("expands to show text blocks when clicked", () => {
    render(<ThinkingToggle messages={messagesWithText} />)
    fireEvent.click(screen.getByText(/Show thinking/))

    expect(screen.getByText("Analyzing the issue.")).toBeInTheDocument()
    expect(screen.getByText("Here is my plan.")).toBeInTheDocument()
    expect(screen.getByText(/Hide thinking/)).toBeInTheDocument()
  })

  it("collapses when hide is clicked", () => {
    render(<ThinkingToggle messages={messagesWithText} />)
    fireEvent.click(screen.getByText(/Show thinking/))
    fireEvent.click(screen.getByText(/Hide thinking/))

    expect(screen.getByText(/Show thinking/)).toBeInTheDocument()
    expect(screen.queryByText("Analyzing the issue.")).not.toBeInTheDocument()
  })

  it("renders numbered counters in expanded state", () => {
    render(<ThinkingToggle messages={messagesWithText} />)
    fireEvent.click(screen.getByText(/Show thinking/))

    expect(screen.getByText("1.")).toBeInTheDocument()
    expect(screen.getByText("2.")).toBeInTheDocument()
  })
})
