import { timeAgo } from "./time-ago"

describe("timeAgo", () => {
  const now = new Date("2026-03-14T12:00:00Z")

  it("returns 'just now' for less than 60 seconds ago", () => {
    expect(timeAgo("2026-03-14T11:59:30Z", now)).toBe("just now")
  })

  it("returns 'just now' for exactly 0 seconds ago", () => {
    expect(timeAgo("2026-03-14T12:00:00Z", now)).toBe("just now")
  })

  it("returns '1 minute ago' for 60 seconds", () => {
    expect(timeAgo("2026-03-14T11:59:00Z", now)).toBe("1 minute ago")
  })

  it("returns 'N minutes ago' for 2-59 minutes", () => {
    expect(timeAgo("2026-03-14T11:30:00Z", now)).toBe("30 minutes ago")
    expect(timeAgo("2026-03-14T11:58:00Z", now)).toBe("2 minutes ago")
  })

  it("returns '1 hour ago' for 60-119 minutes", () => {
    expect(timeAgo("2026-03-14T11:00:00Z", now)).toBe("1 hour ago")
  })

  it("returns 'N hours ago' for 2-22 hours", () => {
    expect(timeAgo("2026-03-14T06:00:00Z", now)).toBe("6 hours ago")
    expect(timeAgo("2026-03-13T14:00:00Z", now)).toBe("22 hours ago")
  })

  it("returns 'yesterday' for 23-47 hours", () => {
    expect(timeAgo("2026-03-13T13:00:00Z", now)).toBe("yesterday")
    expect(timeAgo("2026-03-12T13:00:00Z", now)).toBe("yesterday")
  })

  it("returns 'N days ago' for 2-6 days", () => {
    expect(timeAgo("2026-03-12T12:00:00Z", now)).toBe("2 days ago")
    expect(timeAgo("2026-03-08T12:00:00Z", now)).toBe("6 days ago")
  })

  it("returns 'last week' for 7-13 days", () => {
    expect(timeAgo("2026-03-07T12:00:00Z", now)).toBe("last week")
    expect(timeAgo("2026-03-01T12:00:00Z", now)).toBe("last week")
  })

  it("returns 'N weeks ago' for 2-3 weeks", () => {
    expect(timeAgo("2026-02-28T12:00:00Z", now)).toBe("2 weeks ago")
    expect(timeAgo("2026-02-21T12:00:00Z", now)).toBe("3 weeks ago")
  })

  it("returns 'last month' for 4-7 weeks", () => {
    expect(timeAgo("2026-02-14T12:00:00Z", now)).toBe("last month")
  })

  it("returns 'N months ago' for 2-11 months", () => {
    expect(timeAgo("2025-12-14T12:00:00Z", now)).toBe("3 months ago")
    expect(timeAgo("2025-04-14T12:00:00Z", now)).toBe("11 months ago")
  })

  it("returns 'N years ago' for 12+ months", () => {
    expect(timeAgo("2025-03-14T12:00:00Z", now)).toBe("1 year ago")
    expect(timeAgo("2024-03-14T12:00:00Z", now)).toBe("2 years ago")
  })

  it("defaults to Date.now when now is not provided", () => {
    const recent = new Date(Date.now() - 5000).toISOString()
    expect(timeAgo(recent)).toBe("just now")
  })
})
