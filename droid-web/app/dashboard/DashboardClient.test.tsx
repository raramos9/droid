import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { DashboardClient } from "./DashboardClient"
import type { EnrolledRepo, Repo } from "@/lib/types"

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const enrolledRepo: EnrolledRepo = {
  id: 1,
  owner: "testuser",
  repo: "enrolled-repo",
  webhook_id: 123,
  installed_by: "testuser",
  created_at: "2024-01-01T00:00:00Z",
}

function makeRepo(name: string, ownerLogin = "testuser", isPrivate = false, overrides: Partial<Repo> = {}): Repo {
  return {
    full_name: `${ownerLogin}/${name}`,
    owner: { login: ownerLogin },
    name,
    private: isPrivate,
    pushed_at: "2024-01-15T10:00:00Z",
    language: null,
    description: null,
    fork: false,
    parent: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("DashboardClient", () => {
  it("fetches default repo list on mount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-repo")]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/github/repos"))
    await waitFor(() => expect(screen.getByText("my-repo")).toBeInTheDocument())
  })

  it("shows repo name and visibility badge", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          makeRepo("public-repo", "testuser", false),
          makeRepo("private-repo", "testuser", true),
        ]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("public-repo")).toBeInTheDocument())
    expect(screen.getByText("Public")).toBeInTheDocument()
    expect(screen.getByText("Private")).toBeInTheDocument()
  })

  it("shows Enrolled badge and View activity link for enrolled repos", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("enrolled-repo")]),
    })
    render(<DashboardClient enrolledRepos={[enrolledRepo]} />)

    await waitFor(() => expect(screen.getByText("enrolled-repo")).toBeInTheDocument())
    expect(screen.getByText("Enrolled")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /view activity/i })).toHaveAttribute(
      "href",
      "/dashboard/testuser/enrolled-repo"
    )
    expect(screen.queryByRole("button", { name: /^enroll$/i })).toBeNull()
  })

  it("shows Enroll button for unenrolled repos", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("new-repo")]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByRole("button", { name: /^enroll$/i })).toBeInTheDocument())
    expect(screen.queryByText("Enrolled")).toBeNull()
  })

  it("filters repos live as user types without button click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-api"), makeRepo("my-frontend")]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("my-api")).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/find a repository/i), { target: { value: "api" } })

    expect(screen.getByText("my-api")).toBeInTheDocument()
    expect(screen.queryByText("my-frontend")).not.toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("resets to full list when filter is cleared", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-api"), makeRepo("my-frontend")]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("my-api")).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/find a repository/i), { target: { value: "api" } })
    expect(screen.queryByText("my-frontend")).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/find a repository/i), { target: { value: "" } })
    expect(screen.getByText("my-frontend")).toBeInTheDocument()
  })

  it("shows section heading 'All repositories'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("a-repo")]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText(/all repositories/i)).toBeInTheDocument())
  })

  it("shows pagination buttons when repos exceed 20", async () => {
    const repos = Array.from({ length: 25 }, (_, i) => makeRepo(`repo-${i + 1}`))
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(repos) })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("repo-1")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument()
    expect(screen.queryByText("repo-21")).not.toBeInTheDocument()
  })

  it("navigates to page 2 and shows correct repos", async () => {
    const repos = Array.from({ length: 25 }, (_, i) => makeRepo(`repo-${i + 1}`))
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(repos) })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("repo-1")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "2" }))

    expect(screen.getByText("repo-21")).toBeInTheDocument()
    expect(screen.queryByText("repo-1")).not.toBeInTheDocument()
  })

  it("triggers enroll and calls router.refresh() on success", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeRepo("my-repo")]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

    render(<DashboardClient enrolledRepos={[]} />)
    await waitFor(() => screen.getByRole("button", { name: /^enroll$/i }))

    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/enroll",
      expect.objectContaining({ method: "POST" })
    )
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("shows error when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<DashboardClient enrolledRepos={[]} />)

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

    render(<DashboardClient enrolledRepos={[]} />)
    await waitFor(() => screen.getByRole("button", { name: /^enroll$/i }))

    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }))
    await waitFor(() => expect(screen.getByText(/already enrolled/i)).toBeInTheDocument())
  })

  it("shows language and description when repo has them", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          makeRepo("ts-repo", "testuser", false, {
            language: "TypeScript",
            description: "A TypeScript project",
          }),
        ]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("ts-repo")).toBeInTheDocument())
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
    expect(screen.getByText("A TypeScript project")).toBeInTheDocument()
  })

  it("shows empty grid when no repos match filter", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([makeRepo("my-api")]),
    })
    render(<DashboardClient enrolledRepos={[]} />)

    await waitFor(() => expect(screen.getByText("my-api")).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/find a repository/i), {
      target: { value: "zzznomatch" },
    })

    expect(screen.getByTestId("repo-grid-empty")).toBeInTheDocument()
  })
})
