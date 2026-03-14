import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { InlineChat } from "./InlineChat"

const mockContext = {
  type: "issue" as const,
  number: 42,
  owner: "acme",
  repo: "api",
  summary: "Fix login bug",
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
})

describe("InlineChat", () => {
  it("renders empty state placeholder", () => {
    render(<InlineChat context={mockContext} />)
    expect(screen.getByText(/ask droid anything/)).toBeInTheDocument()
  })

  it("renders textarea for input", () => {
    render(<InlineChat context={mockContext} />)
    const textarea = screen.getByPlaceholderText(/ask droid/)
    expect(textarea.tagName).toBe("TEXTAREA")
  })

  it("disables submit button when input is empty", () => {
    render(<InlineChat context={mockContext} />)
    const button = screen.getByRole("button", { name: /send/i })
    expect(button).toBeDisabled()
  })

  it("enables submit button when input has text", () => {
    render(<InlineChat context={mockContext} />)
    const textarea = screen.getByPlaceholderText(/ask droid/)
    fireEvent.change(textarea, { target: { value: "hello" } })
    const button = screen.getByRole("button", { name: /send/i })
    expect(button).not.toBeDisabled()
  })

  it("sends message and displays response", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ role: "assistant", content: "Here is my answer." }),
    })

    render(<InlineChat context={mockContext} />)
    const textarea = screen.getByPlaceholderText(/ask droid/)
    fireEvent.change(textarea, { target: { value: "What is this?" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText("What is this?")).toBeInTheDocument()
      expect(screen.getByText("Here is my answer.")).toBeInTheDocument()
    })
  })

  it("clears input after sending", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ role: "assistant", content: "Response" }),
    })

    render(<InlineChat context={mockContext} />)
    const textarea = screen.getByPlaceholderText(/ask droid/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "hello" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    await waitFor(() => {
      expect(textarea.value).toBe("")
    })
  })

  it("shows error message on fetch failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "API error" }),
    })

    render(<InlineChat context={mockContext} />)
    const textarea = screen.getByPlaceholderText(/ask droid/)
    fireEvent.change(textarea, { target: { value: "hello" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText(/API error/)).toBeInTheDocument()
    })
  })

  it("disables submit while loading", async () => {
    let resolvePromise: (v: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve })
    )

    render(<InlineChat context={mockContext} />)
    const textarea = screen.getByPlaceholderText(/ask droid/)
    fireEvent.change(textarea, { target: { value: "hello" } })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))

    // Button should be disabled during loading (input cleared + loading true)
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled()

    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ role: "assistant", content: "Done" }),
    })

    // After loading completes, type new input to verify button becomes enabled
    await waitFor(() => {
      expect(screen.getByText("Done")).toBeInTheDocument()
    })

    fireEvent.change(textarea, { target: { value: "follow up" } })
    expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled()
  })
})
