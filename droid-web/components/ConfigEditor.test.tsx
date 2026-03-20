import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ConfigEditor } from "./ConfigEditor"

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

describe("ConfigEditor", () => {
  it("renders textarea with initial value", () => {
    render(<ConfigEditor url="/api/config" initialValue="my rules" fetchKey="configText" />)
    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveValue("my rules")
  })

  it("renders empty textarea when no initial value", () => {
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)
    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveValue("")
  })

  it("updates textarea on change", () => {
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "new rules" } })
    expect(textarea).toHaveValue("new rules")
  })

  it("shows save button", () => {
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
  })

  it("calls fetch with correct args on save", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    render(<ConfigEditor url="/api/config" fetchKey="configText" initialValue="my rules" />)

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/config",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ configText: "my rules" }),
        })
      )
    )
  })

  it("shows saved state after successful save", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument())
  })

  it("shows error state on failed save", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Too large" }),
    })
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/Too large/i)).toBeInTheDocument())
  })

  it("shows error state on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument())
  })

  it("disables save button while saving", async () => {
    let resolveFetch!: () => void
    mockFetch.mockReturnValue(
      new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
        resolveFetch = () => resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
      })
    )
    render(<ConfigEditor url="/api/config" fetchKey="configText" />)

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled()

    resolveFetch()
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument())
  })

  it("passes extra body fields via extraBody prop", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    render(
      <ConfigEditor
        url="/api/config/repo"
        fetchKey="overrides"
        extraBody={{ owner: "acme", repo: "api" }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/config/repo",
        expect.objectContaining({
          body: JSON.stringify({ owner: "acme", repo: "api", overrides: "" }),
        })
      )
    )
  })
})
