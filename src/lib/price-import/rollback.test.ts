import { describe, expect, it } from "vitest"
import { canRevertLoggedPrice } from "./rollback"

describe("price import rollback", () => {
  it("allows rollback when the current price still equals the imported price", () => {
    expect(canRevertLoggedPrice(9840, 9840)).toBe(true)
    expect(canRevertLoggedPrice(9840.0, 9840)).toBe(true)
  })

  it("blocks rollback when the product was changed after the import", () => {
    expect(canRevertLoggedPrice(10000, 9840)).toBe(false)
  })
})
