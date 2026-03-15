import { render, screen, fireEvent } from "@testing-library/react"
import { RepoCard } from "./RepoCard"
import type { Repo } from "@/lib/types"

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    full_name: "testuser/my-repo",
    owner: { login: "testuser" },
    name: "my-repo",
    private: false,
    pushed_at: "2024-01-15T10:00:00Z",
    language: null,
    description: null,
    fork: false,
    parent: null,
    ...overrides,
  }
}

describe("RepoCard", () => {
  it("renders repo name", () => {
    render(<RepoCard repo={makeRepo()} enrolled={false} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.getByText("my-repo")).toBeInTheDocument()
  })

  it("shows Public badge for public repo", () => {
    render(<RepoCard repo={makeRepo({ private: false })} enrolled={false} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.getByText("Public")).toBeInTheDocument()
  })

  it("shows Private badge for private repo", () => {
    render(<RepoCard repo={makeRepo({ private: true })} enrolled={false} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.getByText("Private")).toBeInTheDocument()
  })

  it("shows description when available", () => {
    render(
      <RepoCard
        repo={makeRepo({ description: "A great project" })}
        enrolled={false}
        enrolling={false}
        onEnroll={jest.fn()}
      />
    )
    expect(screen.getByText("A great project")).toBeInTheDocument()
  })

  it("does not show description when null", () => {
    const { container } = render(
      <RepoCard repo={makeRepo({ description: null })} enrolled={false} enrolling={false} onEnroll={jest.fn()} />
    )
    expect(container.querySelector("[data-testid='repo-description']")).toBeNull()
  })

  it("shows fork info when repo is a fork", () => {
    render(
      <RepoCard
        repo={makeRepo({ fork: true, parent: { full_name: "upstream/original" } })}
        enrolled={false}
        enrolling={false}
        onEnroll={jest.fn()}
      />
    )
    expect(screen.getByText(/forked from/i)).toBeInTheDocument()
    expect(screen.getByText(/upstream\/original/i)).toBeInTheDocument()
  })

  it("does not show fork info for non-fork repos", () => {
    render(<RepoCard repo={makeRepo({ fork: false })} enrolled={false} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.queryByText(/forked from/i)).toBeNull()
  })

  it("shows language dot and name when language is set", () => {
    render(
      <RepoCard
        repo={makeRepo({ language: "TypeScript" })}
        enrolled={false}
        enrolling={false}
        onEnroll={jest.fn()}
      />
    )
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
    expect(screen.getByTestId("language-dot")).toBeInTheDocument()
  })

  it("does not show language section when language is null", () => {
    render(<RepoCard repo={makeRepo({ language: null })} enrolled={false} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.queryByTestId("language-dot")).toBeNull()
  })

  it("shows Enroll button for unenrolled repos", () => {
    render(<RepoCard repo={makeRepo()} enrolled={false} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.getByRole("button", { name: /^enroll$/i })).toBeInTheDocument()
    expect(screen.queryByText("Enrolled")).toBeNull()
  })

  it("shows Enrolled badge and View activity link for enrolled repos", () => {
    render(<RepoCard repo={makeRepo()} enrolled={true} enrolling={false} onEnroll={jest.fn()} />)
    expect(screen.getByText("Enrolled")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /view activity/i })).toHaveAttribute(
      "href",
      "/dashboard/testuser/my-repo"
    )
    expect(screen.queryByRole("button", { name: /^enroll$/i })).toBeNull()
  })

  it("calls onEnroll when Enroll button is clicked", () => {
    const onEnroll = jest.fn()
    render(<RepoCard repo={makeRepo()} enrolled={false} enrolling={false} onEnroll={onEnroll} />)
    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }))
    expect(onEnroll).toHaveBeenCalledTimes(1)
  })

  it("shows 'Enrolling...' and disables button while enrolling", () => {
    render(<RepoCard repo={makeRepo()} enrolled={false} enrolling={true} onEnroll={jest.fn()} />)
    const btn = screen.getByRole("button", { name: /enrolling/i })
    expect(btn).toBeDisabled()
  })
})
