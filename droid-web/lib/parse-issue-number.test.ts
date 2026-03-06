import { parseIssueNumber } from "./parse-issue-number"

describe("parseIssueNumber", () => {
  it("returns a valid integer for a numeric string", () => {
    expect(parseIssueNumber("42")).toBe(42)
  })

  it("returns null for a non-numeric string", () => {
    expect(parseIssueNumber("abc")).toBeNull()
  })

  it("returns null for NaN-producing input", () => {
    expect(parseIssueNumber("")).toBeNull()
    expect(parseIssueNumber("../evil")).toBeNull()
  })

  it("returns null for negative numbers", () => {
    expect(parseIssueNumber("-1")).toBeNull()
  })

  it("returns null for zero", () => {
    expect(parseIssueNumber("0")).toBeNull()
  })
})
