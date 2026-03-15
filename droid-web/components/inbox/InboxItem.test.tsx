import { render, screen, fireEvent } from "@testing-library/react"
import { InboxItem } from "./InboxItem"
import type { PendingActionWithContext } from "@/lib/types"

const action: PendingActionWithContext = {
  id: 1,
  run_id: "run-1",
  tool_use_id: "tui-1",
  tool: "pushCode",
  args: { branch: "main" },
  status: "pending",
  created_at: "2026-03-14T10:00:00Z",
  repo_owner: "acme",
  repo_name: "frontend",
  issue_number: 42,
  issue_title: "Fix login bug",
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  })
})

describe("InboxItem", () => {
  it("renders repo and issue info", () => {
    render(<InboxItem action={action} selected={false} onSelect={jest.fn()} />)
    expect(screen.getByText(/acme\/frontend/)).toBeInTheDocument()
    expect(screen.getByText(/Fix login bug/)).toBeInTheDocument()
  })

  it("renders the tool name", () => {
    render(<InboxItem action={action} selected={false} onSelect={jest.fn()} />)
    expect(screen.getByText("pushCode")).toBeInTheDocument()
  })

  it("calls onSelect when clicked", () => {
    const onSelect = jest.fn()
    render(<InboxItem action={action} selected={false} onSelect={onSelect} />)
    fireEvent.click(screen.getByText(/Fix login bug/))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("shows Approve and Reject buttons when selected", () => {
    render(<InboxItem action={action} selected={true} onSelect={jest.fn()} />)
    expect(screen.getByText("Approve")).toBeInTheDocument()
    expect(screen.getByText("Reject")).toBeInTheDocument()
  })

  it("hides Approve/Reject buttons when not selected", () => {
    render(<InboxItem action={action} selected={false} onSelect={jest.fn()} />)
    expect(screen.queryByText("Approve")).not.toBeInTheDocument()
    expect(screen.queryByText("Reject")).not.toBeInTheDocument()
  })

  it("applies selected background when selected", () => {
    const { container } = render(
      <InboxItem action={action} selected={true} onSelect={jest.fn()} />
    )
    const root = container.firstChild as HTMLElement
    expect(root).toHaveStyle({ background: "var(--selection-bg)" })
  })
})
