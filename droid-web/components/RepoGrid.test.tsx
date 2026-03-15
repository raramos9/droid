import { render, screen, fireEvent } from "@testing-library/react"
import { RepoGrid } from "./RepoGrid"
import type { Repo } from "@/lib/types"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

function makeRepo(name: string, overrides: Partial<Repo> = {}): Repo {
  return {
    full_name: `testuser/${name}`,
    owner: { login: "testuser" },
    name,
    private: false,
    pushed_at: "2024-01-15T10:00:00Z",
    language: null,
    description: null,
    fork: false,
    parent: null,
    ...overrides,
  }
}

describe("RepoGrid", () => {
  it("renders a card for each repo", () => {
    const repos = [makeRepo("repo-a"), makeRepo("repo-b"), makeRepo("repo-c")]
    render(
      <RepoGrid
        repos={repos}
        enrolledSet={new Set()}
        enrolling={null}
        onEnroll={jest.fn()}
      />
    )
    expect(screen.getByText("repo-a")).toBeInTheDocument()
    expect(screen.getByText("repo-b")).toBeInTheDocument()
    expect(screen.getByText("repo-c")).toBeInTheDocument()
  })

  it("renders empty state when no repos", () => {
    render(
      <RepoGrid repos={[]} enrolledSet={new Set()} enrolling={null} onEnroll={jest.fn()} />
    )
    expect(screen.getByTestId("repo-grid-empty")).toBeInTheDocument()
  })

  it("marks enrolled repos correctly", () => {
    const repos = [makeRepo("enrolled"), makeRepo("not-enrolled")]
    const enrolledSet = new Set(["testuser/enrolled"])
    render(
      <RepoGrid repos={repos} enrolledSet={enrolledSet} enrolling={null} onEnroll={jest.fn()} />
    )
    expect(screen.getByText("Enrolled")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^enroll$/i })).toBeInTheDocument()
  })

  it("passes enrolling state to the correct card", () => {
    const repos = [makeRepo("busy-repo"), makeRepo("idle-repo")]
    render(
      <RepoGrid
        repos={repos}
        enrolledSet={new Set()}
        enrolling="testuser/busy-repo"
        onEnroll={jest.fn()}
      />
    )
    expect(screen.getByRole("button", { name: /enrolling/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^enroll$/i })).not.toBeDisabled()
  })

  it("calls onEnroll with the repo when card's enroll is clicked", () => {
    const repos = [makeRepo("click-me")]
    const onEnroll = jest.fn()
    render(
      <RepoGrid repos={repos} enrolledSet={new Set()} enrolling={null} onEnroll={onEnroll} />
    )
    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }))
    expect(onEnroll).toHaveBeenCalledWith(repos[0])
  })
})
