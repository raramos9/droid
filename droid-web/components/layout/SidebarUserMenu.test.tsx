import { render, screen, fireEvent } from "@testing-library/react"
import { SidebarUserMenu } from "./SidebarUserMenu"

const defaultUser = { name: "alice", email: "alice@example.com", image: null }

describe("SidebarUserMenu", () => {
  it("renders the username when expanded", () => {
    render(<SidebarUserMenu user={defaultUser} collapsed={false} />)
    expect(screen.getByText("alice")).toBeInTheDocument()
  })

  it("hides the username when collapsed", () => {
    render(<SidebarUserMenu user={defaultUser} collapsed={true} />)
    expect(screen.queryByText("alice")).not.toBeInTheDocument()
  })

  it("falls back to email when name is null", () => {
    render(
      <SidebarUserMenu
        user={{ name: null, email: "alice@example.com", image: null }}
        collapsed={false}
      />
    )
    expect(screen.getByText("alice@example.com")).toBeInTheDocument()
  })

  it("falls back to 'User' when both name and email are null", () => {
    render(
      <SidebarUserMenu
        user={{ name: null, email: null, image: null }}
        collapsed={false}
      />
    )
    expect(screen.getByText("User")).toBeInTheDocument()
  })

  it("renders the user trigger button", () => {
    render(<SidebarUserMenu user={defaultUser} collapsed={false} />)
    expect(screen.getByRole("button", { name: /user menu/i })).toBeInTheDocument()
  })
})
