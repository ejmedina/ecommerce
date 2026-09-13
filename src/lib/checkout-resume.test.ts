import { describe, expect, it } from "vitest"
import { buildCheckoutLoginUrl, getCheckoutReturnTo } from "./checkout-resume"

describe("checkout verification continuation", () => {
  it("accepts checkout as the only continuation target", () => {
    expect(getCheckoutReturnTo("/checkout")).toBe("/checkout")
    expect(getCheckoutReturnTo("/account")).toBeNull()
    expect(getCheckoutReturnTo("https://malicious.example")).toBeNull()
    expect(getCheckoutReturnTo("//malicious.example")).toBeNull()
  })

  it("builds the checkout login continuation only for the approved target", () => {
    expect(buildCheckoutLoginUrl("/checkout")).toBe("/login?returnUrl=%2Fcheckout")
    expect(buildCheckoutLoginUrl("https://malicious.example")).toBe("/login")
  })
})
