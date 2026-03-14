import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { EnrollModal } from "./EnrollModal"

const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
})

describe("EnrollModal", () => {
  it("renders search input and search button", () => {
    render(<EnrollModal onClose={jest.fn()} />)
    expect(screen.getByPlaceholderText(/search your repos/i)).toBeInTheDocument()
    expect(screen.getByText("Search")).toBeInTheDocument()
  })

  it("renders close button", () => {
    const onClose = jest.fn()
    render(<EnrollModal onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("Close"))
    expect(onClose).toHaveBeenCalled()
  })

  it("searches repos on button click", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { full_name: "acme/api", owner: { login: "acme" }, name: "api", private: false },
      ]),
    })

    render(<EnrollModal onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "acme" } })
    fireEvent.click(screen.getByText("Search"))

    await waitFor(() => {
      expect(screen.getByText("acme/api")).toBeInTheDocument()
    })
  })

  it("does not search when query is empty", () => {
    render(<EnrollModal onClose={jest.fn()} />)
    fireEvent.click(screen.getByText("Search"))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("enrolls repo and calls onClose", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { full_name: "acme/api", owner: { login: "acme" }, name: "api", private: false },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

    const onClose = jest.fn()
    render(<EnrollModal onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "acme" } })
    fireEvent.click(screen.getByText("Search"))

    await waitFor(() => {
      expect(screen.getByText("Enroll")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Enroll"))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("shows error on search failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    })

    render(<EnrollModal onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "acme" } })
    fireEvent.click(screen.getByText("Search"))

    await waitFor(() => {
      expect(screen.getByText(/Failed to search/)).toBeInTheDocument()
    })
  })

  it("shows error on enrollment failure", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { full_name: "acme/api", owner: { login: "acme" }, name: "api", private: false },
        ]),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Enrollment failed" }),
      })

    render(<EnrollModal onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "acme" } })
    fireEvent.click(screen.getByText("Search"))

    await waitFor(() => {
      expect(screen.getByText("Enroll")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Enroll"))

    await waitFor(() => {
      expect(screen.getByText("Enrollment failed")).toBeInTheDocument()
    })
  })

  it("shows private badge for private repos", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { full_name: "acme/secret", owner: { login: "acme" }, name: "secret", private: true },
      ]),
    })

    render(<EnrollModal onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "acme" } })
    fireEvent.click(screen.getByText("Search"))

    await waitFor(() => {
      expect(screen.getByText("[private]")).toBeInTheDocument()
    })
  })

  it("searches on Enter key", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<EnrollModal onClose={jest.fn()} />)
    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: "acme" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/github/repos")
      )
    })
  })
})
