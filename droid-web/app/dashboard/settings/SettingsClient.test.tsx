import { render, screen, waitFor } from "@testing-library/react"
import { SettingsClient } from "./SettingsClient"

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

describe("SettingsClient", () => {
  it("renders heading", () => {
    render(<SettingsClient initialConfigText={null} />)
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument()
  })

  it("renders ConfigEditor with initial value", () => {
    render(<SettingsClient initialConfigText="my rules" />)
    expect(screen.getByRole("textbox")).toHaveValue("my rules")
  })

  it("renders ConfigEditor with empty value when null", () => {
    render(<SettingsClient initialConfigText={null} />)
    expect(screen.getByRole("textbox")).toHaveValue("")
  })

  it("renders shell command helper text", () => {
    render(<SettingsClient initialConfigText={null} />)
    expect(screen.getByText(/cat ~\/.claude\/CLAUDE.md/)).toBeInTheDocument()
  })

  it("renders save button", () => {
    render(<SettingsClient initialConfigText={null} />)
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
  })
})
