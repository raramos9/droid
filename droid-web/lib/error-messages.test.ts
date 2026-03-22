import { mapSupabaseError } from "./error-messages"

describe("mapSupabaseError", () => {
  it("maps unique_violation (23505) to already enrolled message", () => {
    expect(mapSupabaseError({ code: "23505" })).toBe("This repository is already enrolled.")
  })

  it("maps foreign_key_violation (23503) to resource not found message", () => {
    expect(mapSupabaseError({ code: "23503" })).toBe("Referenced resource not found.")
  })

  it("maps insufficient_privilege (42501) to permission denied message", () => {
    expect(mapSupabaseError({ code: "42501" })).toBe("Permission denied.")
  })

  it("returns generic message for unknown error code", () => {
    expect(mapSupabaseError({ code: "99999" })).toBe(
      "An unexpected error occurred. Please try again."
    )
  })

  it("returns generic message when error has no code", () => {
    expect(mapSupabaseError({ message: "something broke" })).toBe(
      "An unexpected error occurred. Please try again."
    )
  })

  it("returns generic message for null", () => {
    expect(mapSupabaseError(null)).toBe("An unexpected error occurred. Please try again.")
  })

  it("returns generic message for undefined", () => {
    expect(mapSupabaseError(undefined)).toBe("An unexpected error occurred. Please try again.")
  })
})
