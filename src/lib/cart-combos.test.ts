import { describe, expect, it } from "vitest"
import {
  parseCartComboConfiguration,
  validateComboCartSelection,
} from "./cart-combos"

describe("cart combo validation", () => {
  const comboProduct = {
    isCombo: true,
    comboComponents: [
      {
        id: "component-simple",
        productId: "product-medialuna",
        quantity: 6,
        product: {
          id: "product-medialuna",
          name: "Medialuna",
          hasVariants: false,
          hasPermanentStock: false,
          stock: 18,
          variants: [],
        },
      },
      {
        id: "component-variant",
        productId: "product-cafe",
        quantity: 1,
        product: {
          id: "product-cafe",
          name: "Cafe",
          hasVariants: true,
          hasPermanentStock: false,
          stock: 0,
          variants: [
            {
              id: "variant-250",
              title: "250g",
              stock: 4,
            },
          ],
        },
      },
    ],
  }

  it("parses combo configuration from form payload", () => {
    const configuration = parseCartComboConfiguration(JSON.stringify([
      {
        comboComponentId: "component-simple",
        productId: "product-medialuna",
        productName: "Medialuna",
        variantId: null,
        variantTitle: null,
        quantityPerCombo: 6,
      },
    ]))

    expect(configuration).toHaveLength(1)
    expect(configuration[0]?.productId).toBe("product-medialuna")
  })

  it("normalizes a valid combo selection and computes signature", () => {
    const result = validateComboCartSelection({
      product: comboProduct,
      rawConfiguration: [
        {
          comboComponentId: "component-variant",
          productId: "product-cafe",
          productName: "Cafe viejo",
          variantId: "variant-250",
          variantTitle: "otra cosa",
          quantityPerCombo: 999,
        },
        {
          comboComponentId: "component-simple",
          productId: "product-medialuna",
          productName: "Medialuna vieja",
          variantId: null,
          variantTitle: null,
          quantityPerCombo: 999,
        },
      ],
      quantity: 2,
    })

    expect(result.availableStock).toBe(3)
    expect(result.selectionSignature).toBe(
      "component-simple:product-medialuna:base:6|component-variant:product-cafe:variant-250:1"
    )
    expect(result.configuration[1]?.variantTitle).toBe("250g")
  })

  it("rejects incomplete variant selections", () => {
    expect(() =>
      validateComboCartSelection({
        product: comboProduct,
        rawConfiguration: [
          {
            comboComponentId: "component-simple",
            productId: "product-medialuna",
            productName: "Medialuna",
            variantId: null,
            variantTitle: null,
            quantityPerCombo: 6,
          },
          {
            comboComponentId: "component-variant",
            productId: "product-cafe",
            productName: "Cafe",
            variantId: null,
            variantTitle: null,
            quantityPerCombo: 1,
          },
        ],
        quantity: 1,
      })
    ).toThrow("Elegi una variante para Cafe.")
  })
})
