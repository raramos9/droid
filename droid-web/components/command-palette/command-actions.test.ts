import { buildActions, filterActions } from "./command-actions"

const repos = [
  { owner: "acme", repo: "frontend" },
  { owner: "acme", repo: "backend" },
]

describe("buildActions", () => {
  it("includes static navigation actions", () => {
    const actions = buildActions({ repos })
    const labels = actions.map((a) => a.label)
    expect(labels).toContain("Go to Dashboard")
    expect(labels).toContain("Go to Inbox")
  })

  it("includes a repo action for each enrolled repo", () => {
    const actions = buildActions({ repos })
    const labels = actions.map((a) => a.label)
    expect(labels).toContain("frontend")
    expect(labels).toContain("backend")
  })

  it("repo actions are in Repositories section", () => {
    const actions = buildActions({ repos })
    const repoActions = actions.filter((a) => a.section === "Repositories")
    expect(repoActions.length).toBe(2)
  })

  it("navigation actions are in Navigation section", () => {
    const actions = buildActions({ repos })
    const navActions = actions.filter((a) => a.section === "Navigation")
    expect(navActions.length).toBeGreaterThan(0)
  })

  it("each action has id, label, section, onSelect", () => {
    const actions = buildActions({ repos })
    for (const action of actions) {
      expect(action.id).toBeTruthy()
      expect(action.label).toBeTruthy()
      expect(action.section).toBeTruthy()
      expect(typeof action.onSelect).toBe("function")
    }
  })
})

describe("filterActions", () => {
  const actions = buildActions({ repos })

  it("returns all actions when query is empty", () => {
    expect(filterActions(actions, "")).toEqual(actions)
  })

  it("filters by label substring (case-insensitive)", () => {
    const results = filterActions(actions, "front")
    expect(results.some((a) => a.label === "frontend")).toBe(true)
    expect(results.some((a) => a.label === "backend")).toBe(false)
  })

  it("returns empty array when no match", () => {
    expect(filterActions(actions, "xyznotfound")).toHaveLength(0)
  })

  it("matches case-insensitively", () => {
    const results = filterActions(actions, "DASHBOARD")
    expect(results.some((a) => a.label === "Go to Dashboard")).toBe(true)
  })
})
