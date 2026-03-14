import { render, screen } from "@testing-library/react"
import { SidebarNav } from "./SidebarNav"

const repos = [
  { owner: "acme", repo: "frontend" },
  { owner: "acme", repo: "backend" },
]

describe("SidebarNav", () => {
  it("renders the Inbox link", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={false} />)
    expect(screen.getByRole("link", { name: /inbox/i })).toBeInTheDocument()
  })

  it("shows inbox count badge when count > 0", () => {
    render(<SidebarNav repos={repos} inboxCount={3} collapsed={false} />)
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("hides inbox count badge when count is 0", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={false} />)
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("renders repo links when expanded", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={false} />)
    expect(screen.getByRole("link", { name: /frontend/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /backend/i })).toBeInTheDocument()
  })

  it("hides repo names when collapsed", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={true} />)
    expect(screen.queryByText("frontend")).not.toBeInTheDocument()
    expect(screen.queryByText("backend")).not.toBeInTheDocument()
  })

  it("links repos to correct href", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={false} />)
    const link = screen.getByRole("link", { name: /frontend/i })
    expect(link).toHaveAttribute("href", "/dashboard/acme/frontend")
  })

  it("links inbox to correct href", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={false} />)
    const link = screen.getByRole("link", { name: /inbox/i })
    expect(link).toHaveAttribute("href", "/dashboard/inbox")
  })

  it("shows Repositories section label when expanded and repos exist", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={false} />)
    expect(screen.getByText("Repositories")).toBeInTheDocument()
  })

  it("hides Repositories section label when collapsed", () => {
    render(<SidebarNav repos={repos} inboxCount={0} collapsed={true} />)
    expect(screen.queryByText("Repositories")).not.toBeInTheDocument()
  })
})
