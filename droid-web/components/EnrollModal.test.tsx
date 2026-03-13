import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { EnrollModal } from "./EnrollModal"
import type { EnrolledRepo } from "@/lib/types"

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockOnClose = jest.fn()

const enrolledRepo: EnrolledRepo = {
  id: 1,
  owner: "testuser",
  repo: "enrolled-repo",
  webhook_id: 123,
  installed_by: "testuser",
  created_at: "2024-01-01T00:00:00Z",
}

function makeRepo(name: string, ownerLogin = "testuser", isPrivate = false) {
  return {
    full_name: `${ownerLogin}/${name}`,
    owner: { login: ownerLogin },
    name,
    private: isPrivate,
    pushed_at: "2024-01-15T10:00:00Z",
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("EnrollModal", () => {
  it("renders search input and button", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)
    expect(screen.getByPlaceholderText(/search your repos/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument())
  })

  it("calls close handler when X is clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)
    await waitFor(() => expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /close/i }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("close button has accessible aria-label", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)
    await waitFor(() => expect(screen.getByRole("button", { name: /close/i })).toHaveAttribute("aria-label", "Close"))
  })

  it("fetches default repo list on mount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-repo")]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/github/repos"))
    await waitFor(() => expect(screen.getByText("testuser/my-repo")).toBeInTheDocument())
  })

  it("shows visibility badge for each repo", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        makeRepo("public-repo", "testuser", false),
        makeRepo("private-repo", "testuser", true),
      ]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("testuser/public-repo")).toBeInTheDocument())
    expect(screen.getByText("Public")).toBeInTheDocument()
    expect(screen.getByText("Private")).toBeInTheDocument()
  })

  it("shows Enrolled badge and no enroll button for enrolled repos", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("enrolled-repo")]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[enrolledRepo]} />)

    await waitFor(() => expect(screen.getByText("testuser/enrolled-repo")).toBeInTheDocument())
    expect(screen.getByText("Enrolled")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^enroll$/i })).toBeNull()
  })

  it("shows Enroll button for unenrolled repos", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("new-repo")]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByRole("button", { name: /^enroll$/i })).toBeInTheDocument())
  })

  it("shows pagination buttons when repos exceed 20", async () => {
    const repos = Array.from({ length: 25 }, (_, i) => makeRepo(`repo-${i + 1}`))
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(repos) })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("testuser/repo-1")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument()
    expect(screen.queryByText("testuser/repo-21")).not.toBeInTheDocument()
  })

  it("navigates to page 2 and shows remaining repos", async () => {
    const repos = Array.from({ length: 25 }, (_, i) => makeRepo(`repo-${i + 1}`))
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(repos) })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("testuser/repo-1")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "2" }))

    expect(screen.getByText("testuser/repo-21")).toBeInTheDocument()
    expect(screen.queryByText("testuser/repo-1")).not.toBeInTheDocument()
  })

  it("filters repos client-side when searching", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-api"), makeRepo("my-frontend")]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("testuser/my-api")).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), { target: { value: "api" } })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))

    expect(screen.getByText("testuser/my-api")).toBeInTheDocument()
    expect(screen.queryByText("testuser/my-frontend")).not.toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("resets to full list when search query is cleared", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-api"), makeRepo("my-frontend")]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("testuser/my-api")).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), { target: { value: "api" } })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))
    expect(screen.queryByText("testuser/my-frontend")).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/search your repos/i), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: /search/i }))
    expect(screen.getByText("testuser/my-frontend")).toBeInTheDocument()
  })

  it("filters on Enter key press", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-api"), makeRepo("my-frontend")]),
    })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("testuser/my-api")).toBeInTheDocument())

    const input = screen.getByPlaceholderText(/search your repos/i)
    fireEvent.change(input, { target: { value: "api" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(screen.getByText("testuser/my-api")).toBeInTheDocument()
    expect(screen.queryByText("testuser/my-frontend")).not.toBeInTheDocument()
  })

  it("triggers enroll call and closes modal on success", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRepo("my-repo")]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)
    await waitFor(() => screen.getByRole("button", { name: /^enroll$/i }))

    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/enroll",
      expect.objectContaining({ method: "POST" })
    )
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("shows error when default list fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument())
  })

  it("shows error when enroll API returns error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRepo("my-repo")]),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Already enrolled" }),
      })

    render(<EnrollModal onClose={mockOnClose} enrolledRepos={[]} />)
    await waitFor(() => screen.getByRole("button", { name: /^enroll$/i }))

    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }))
    await waitFor(() => expect(screen.getByText(/already enrolled/i)).toBeInTheDocument())
  })
})
