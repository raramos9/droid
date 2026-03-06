import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PendingActionPanel } from "./PendingActionPanel"
import type { PendingAction } from "@/lib/types"

const mockFetch = jest.fn()
global.fetch = mockFetch

const pushCodeAction: PendingAction = {
  id: 1,
  run_id: "run-1",
  tool_use_id: "tu-1",
  tool: "pushCode",
  args: { branch: "fix/issue-42", commitMessage: "Fix: resolve null pointer" },
  status: "pending",
  created_at: "2024-01-01T00:00:00Z",
}

const mergePRAction: PendingAction = {
  id: 2,
  run_id: "run-1",
  tool_use_id: "tu-2",
  tool: "mergePR",
  args: { prNumber: 99 },
  status: "pending",
  created_at: "2024-01-01T00:00:00Z",
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true }),
  })
})

describe("PendingActionPanel", () => {
  it("renders tool name and args", () => {
    render(<PendingActionPanel action={pushCodeAction} />)
    expect(screen.getByText(/pushCode/i)).toBeInTheDocument()
    expect(screen.getByText(/fix\/issue-42/i)).toBeInTheDocument()
  })

  it("renders Approve and Reject buttons", () => {
    render(<PendingActionPanel action={pushCodeAction} />)
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument()
  })

  it("calls /api/resume with approved result on Approve click", async () => {
    render(<PendingActionPanel action={pushCodeAction} />)

    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("/api/resume")
    const body = JSON.parse(opts.body)
    expect(body.runId).toBe("run-1")
    expect(body.toolUseId).toBe("tu-1")
    expect(body.result).toBe("approved")
  })

  it("calls /api/resume with rejected result on Reject click", async () => {
    render(<PendingActionPanel action={pushCodeAction} />)

    fireEvent.click(screen.getByRole("button", { name: /reject/i }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [, opts] = mockFetch.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.result).toBe("rejected")
  })

  it("disables buttons after action is taken", async () => {
    render(<PendingActionPanel action={pushCodeAction} />)

    fireEvent.click(screen.getByRole("button", { name: /approve/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /reject/i })).toBeDisabled()
  })

  it("renders mergePR action with PR number", () => {
    render(<PendingActionPanel action={mergePRAction} />)
    expect(screen.getByText(/mergePR/i)).toBeInTheDocument()
    expect(screen.getByText(/99/)).toBeInTheDocument()
  })

  it("shows error message and keeps buttons enabled when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    render(<PendingActionPanel action={pushCodeAction} />)
    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: /approve/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /reject/i })).not.toBeDisabled()
  })

  it("shows error and keeps buttons enabled when server returns non-ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) })

    render(<PendingActionPanel action={pushCodeAction} />)
    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: /approve/i })).not.toBeDisabled()
  })

  it("does not disable buttons after failed action", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    render(<PendingActionPanel action={pushCodeAction} />)
    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    await waitFor(() => screen.getByRole("alert"))
    expect(screen.getByRole("button", { name: /approve/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /reject/i })).not.toBeDisabled()
  })
})
