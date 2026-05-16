import { describe, expect, it } from "vitest"
import {
  buildComboSelectionSignature,
  getOperationalDemandKey,
  summarizeComboConfiguration,
  type CartComboConfiguration,
} from "./combos"

describe("combo helpers", () => {
  it("builds a deterministic selection signature", () => {
    const configuration: CartComboConfiguration = [
      {
        comboComponentId: "component-b",
        productId: "product-2",
        productName: "Cafe",
        variantId: "variant-250",
        variantTitle: "250g",
        quantityPerCombo: 1,
      },
      {
        comboComponentId: "component-a",
        productId: "product-1",
        productName: "Medialuna",
        variantId: null,
        variantTitle: null,
        quantityPerCombo: 6,
      },
    ]

    expect(buildComboSelectionSignature(configuration)).toBe(
      "component-a:product-1:base:6|component-b:product-2:variant-250:1"
    )
  })

  it("groups operational demand by variant when present", () => {
    expect(
      getOperationalDemandKey({
        productId: "product-1",
        variantId: "variant-1",
      })
    ).toBe("variant:variant-1")
  })

  it("groups operational demand by product when there is no variant", () => {
    expect(
      getOperationalDemandKey({
        productId: "product-1",
        variantId: null,
      })
    ).toBe("product:product-1")
  })

  it("summarizes repeated component variants with their own quantities", () => {
    const configuration: CartComboConfiguration = [
      {
        comboComponentId: "component-a",
        productId: "product-1",
        productName: "Alfajor",
        variantId: "variant-choco",
        variantTitle: "Chocolate",
        quantityPerCombo: 2,
      },
      {
        comboComponentId: "component-a",
        productId: "product-1",
        productName: "Alfajor",
        variantId: "variant-maicena",
        variantTitle: "Maicena",
        quantityPerCombo: 1,
      },
    ]

    expect(summarizeComboConfiguration(configuration, 2)).toEqual([
      "4 x Alfajor - Chocolate",
      "2 x Alfajor - Maicena",
    ])
  })
})
