import { describe, expect, it } from "vitest"
import { isExpectedCredentialsSigninError } from "./auth-logging"

describe("Auth logging classification", () => {
  it("classifies only expected invalid-credential errors as informational", () => {
    expect(isExpectedCredentialsSigninError({ type: "CredentialsSignin" })).toBe(true)
    expect(isExpectedCredentialsSigninError({ type: "CallbackRouteError" })).toBe(false)
    expect(isExpectedCredentialsSigninError(new Error("database unavailable"))).toBe(false)
  })
})
