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
          quantityPerCombo: 1,
        },
        {
          comboComponentId: "component-simple",
          productId: "product-medialuna",
          productName: "Medialuna vieja",
          variantId: null,
          variantTitle: null,
          quantityPerCombo: 6,
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

  it("allows direct add for combos that only contain simple products", () => {
    const simpleComboOnly = {
      isCombo: true,
      comboComponents: [
        {
          id: "component-simple",
          productId: "product-medialuna",
          quantity: 2,
          product: {
            id: "product-medialuna",
            name: "Medialuna",
            hasVariants: false,
            hasPermanentStock: false,
            stock: 20,
            variants: [],
          },
        },
      ],
    }

    const parsedConfiguration = parseCartComboConfiguration(null)
    const result = validateComboCartSelection({
      product: simpleComboOnly,
      rawConfiguration: parsedConfiguration,
      quantity: 3,
    })

    expect(result.availableStock).toBe(10)
    expect(result.selectionSignature).toBe("component-simple:product-medialuna:base:2")
    expect(result.configuration).toEqual([
      {
        comboComponentId: "component-simple",
        productId: "product-medialuna",
        productName: "Medialuna",
        variantId: null,
        variantTitle: null,
        quantityPerCombo: 2,
      },
    ])
  })

  it("allows splitting a combo component across multiple variants", () => {
    const comboWithMixedVariants = {
      isCombo: true,
      comboComponents: [
        {
          id: "component-alfajor",
          productId: "product-alfajor",
          quantity: 3,
          product: {
            id: "product-alfajor",
            name: "Alfajor",
            hasVariants: true,
            hasPermanentStock: false,
            stock: 0,
            variants: [
              { id: "variant-choco", title: "Chocolate", stock: 8 },
              { id: "variant-maicena", title: "Maicena", stock: 4 },
            ],
          },
        },
      ],
    }

    const result = validateComboCartSelection({
      product: comboWithMixedVariants,
      rawConfiguration: [
        {
          comboComponentId: "component-alfajor",
          productId: "product-alfajor",
          productName: "Alfajor",
          variantId: "variant-choco",
          variantTitle: "Chocolate",
          quantityPerCombo: 2,
        },
        {
          comboComponentId: "component-alfajor",
          productId: "product-alfajor",
          productName: "Alfajor",
          variantId: "variant-maicena",
          variantTitle: "Maicena",
          quantityPerCombo: 1,
        },
      ],
      quantity: 2,
    })

    expect(result.availableStock).toBe(4)
    expect(result.selectionSignature).toBe(
      "component-alfajor:product-alfajor:variant-choco:2|component-alfajor:product-alfajor:variant-maicena:1"
    )
    expect(result.configuration).toHaveLength(2)
  })
})
