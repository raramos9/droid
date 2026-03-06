import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { EnrollModal } from "./EnrollModal"

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockOnClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

describe("EnrollModal", () => {
  it("renders search input and button", () => {
    render(<EnrollModal onClose={mockOnClose} />)
    expect(screen.getByPlaceholderText(/search your repos/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument()
  })

  it("calls close handler when X is clicked", () => {
    render(<EnrollModal onClose={mockOnClose} />)
    fireEvent.click(screen.getByRole("button", { name: /close/i }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("close button has accessible aria-label", () => {
    render(<EnrollModal onClose={mockOnClose} />)
    expect(screen.getByRole("button", { name: /close/i })).toHaveAttribute("aria-label", "Close")
  })

  it("shows repos returned from search", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { full_name: "acme/api", owner: { login: "acme" }, name: "api", private: false },
      ]),
    })

    render(<EnrollModal onClose={mockOnClose} />)
    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), {
      target: { value: "api" },
    })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))

    await waitFor(() => expect(screen.getByText("acme/api")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: /enroll/i })).toBeInTheDocument()
  })

  it("triggers enroll call and closes modal on success", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { full_name: "acme/api", owner: { login: "acme" }, name: "api", private: false },
        ]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

    render(<EnrollModal onClose={mockOnClose} />)
    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), {
      target: { value: "api" },
    })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))
    await waitFor(() => screen.getByRole("button", { name: /enroll/i }))

    fireEvent.click(screen.getByRole("button", { name: /enroll/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/enroll",
      expect.objectContaining({ method: "POST" })
    )
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("shows error when search fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })

    render(<EnrollModal onClose={mockOnClose} />)
    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), {
      target: { value: "api" },
    })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))

    await waitFor(() => expect(screen.getByText(/failed to search/i)).toBeInTheDocument())
  })

  it("shows error when enroll API returns error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { full_name: "acme/api", owner: { login: "acme" }, name: "api", private: false },
        ]),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Already enrolled" }),
      })

    render(<EnrollModal onClose={mockOnClose} />)
    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), {
      target: { value: "api" },
    })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))
    await waitFor(() => screen.getByRole("button", { name: /enroll/i }))

    fireEvent.click(screen.getByRole("button", { name: /enroll/i }))
    await waitFor(() => expect(screen.getByText(/already enrolled/i)).toBeInTheDocument())
  })

  it("searches on Enter key press", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<EnrollModal onClose={mockOnClose} />)
    const input = screen.getByPlaceholderText(/search your repos/i)
    fireEvent.change(input, { target: { value: "api" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  })
})
