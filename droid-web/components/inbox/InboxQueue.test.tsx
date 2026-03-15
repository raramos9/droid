import { render, screen } from "@testing-library/react"
import { InboxQueue } from "./InboxQueue"
import type { PendingActionWithContext } from "@/lib/types"

const actions: PendingActionWithContext[] = [
  {
    id: 1,
    run_id: "run-1",
    tool_use_id: "tui-1",
    tool: "pushCode",
    args: {},
    status: "pending",
    created_at: "2026-03-14T10:00:00Z",
    repo_owner: "acme",
    repo_name: "frontend",
    issue_number: 42,
    issue_title: "Fix login bug",
  },
  {
    id: 2,
    run_id: "run-2",
    tool_use_id: "tui-2",
    tool: "createPR",
    args: {},
    status: "pending",
    created_at: "2026-03-14T11:00:00Z",
    repo_owner: "acme",
    repo_name: "backend",
    issue_number: 10,
    issue_title: "Add endpoint",
  },
]

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  })
})

describe("InboxQueue", () => {
  it("renders all inbox items", () => {
    render(<InboxQueue actions={actions} />)
    expect(screen.getByText(/Fix login bug/)).toBeInTheDocument()
    expect(screen.getByText(/Add endpoint/)).toBeInTheDocument()
  })

  it("shows empty state when no actions", () => {
    render(<InboxQueue actions={[]} />)
    expect(screen.getByText(/no pending actions/i)).toBeInTheDocument()
  })

  it("shows count header with pending actions text", () => {
    render(<InboxQueue actions={actions} />)
    expect(screen.getByText(/2 pending actions/i)).toBeInTheDocument()
  })

  it("renders tool names", () => {
    render(<InboxQueue actions={actions} />)
    expect(screen.getByText("pushCode")).toBeInTheDocument()
    expect(screen.getByText("createPR")).toBeInTheDocument()
  })
})
