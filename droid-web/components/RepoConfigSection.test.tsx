import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RepoConfigSection } from "./RepoConfigSection"

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

describe("RepoConfigSection", () => {
  it("renders collapsed by default", () => {
    render(<RepoConfigSection owner="acme" repo="api" initialOverrides={null} />)
    expect(screen.getByRole("button", { name: /repo overrides/i })).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("expands on button click", () => {
    render(<RepoConfigSection owner="acme" repo="api" initialOverrides={null} />)
    fireEvent.click(screen.getByRole("button", { name: /repo overrides/i }))
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("collapses again on second click", () => {
    render(<RepoConfigSection owner="acme" repo="api" initialOverrides={null} />)
    const btn = screen.getByRole("button", { name: /repo overrides/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("shows initial overrides in editor when expanded", () => {
    render(<RepoConfigSection owner="acme" repo="api" initialOverrides="custom rules" />)
    fireEvent.click(screen.getByRole("button", { name: /repo overrides/i }))
    expect(screen.getByRole("textbox")).toHaveValue("custom rules")
  })

  it("calls fetch with correct args on save", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    render(<RepoConfigSection owner="acme" repo="api" initialOverrides="custom rules" />)
    fireEvent.click(screen.getByRole("button", { name: /repo overrides/i }))

    fireEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/config/repo",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ owner: "acme", repo: "api", overrides: "custom rules" }),
        })
      )
    )
  })
})
