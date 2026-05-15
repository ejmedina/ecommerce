import { describe, expect, it } from "vitest"
import { buildOrderItemComponentSnapshots } from "./order-combos"

describe("order combo snapshots", () => {
  it("builds operational order item components from combo selections", () => {
    const snapshots = buildOrderItemComponentSnapshots({
      comboQuantity: 2,
      configuration: [
        {
          comboComponentId: "component-a",
          productId: "product-medialuna",
          productName: "Medialuna",
          variantId: null,
          variantTitle: null,
          quantityPerCombo: 6,
        },
        {
          comboComponentId: "component-b",
          productId: "product-cafe",
          productName: "Cafe",
          variantId: "variant-250",
          variantTitle: "250g",
          quantityPerCombo: 1,
        },
      ],
      comboComponents: [
        {
          id: "component-a",
          productId: "product-medialuna",
          quantity: 6,
          product: {
            id: "product-medialuna",
            name: "Medialuna",
            sku: "MED-001",
            variants: [],
          },
        },
        {
          id: "component-b",
          productId: "product-cafe",
          quantity: 1,
          product: {
            id: "product-cafe",
            name: "Cafe",
            sku: "CAF-001",
            variants: [
              {
                id: "variant-250",
                sku: "CAF-250",
                title: "250g",
              },
            ],
          },
        },
      ],
    })

    expect(snapshots).toEqual([
      expect.objectContaining({
        name: "Medialuna",
        sku: "MED-001",
        quantityOrdered: 12,
      }),
      expect.objectContaining({
        name: "Cafe - 250g",
        sku: "CAF-250",
        quantityOrdered: 2,
      }),
    ])
  })
})
