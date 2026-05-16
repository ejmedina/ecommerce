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

  it("keeps separate operational rows when a combo component is split across variants", () => {
    const snapshots = buildOrderItemComponentSnapshots({
      comboQuantity: 1,
      configuration: [
        {
          comboComponentId: "component-a",
          productId: "product-alfajor",
          productName: "Alfajor",
          variantId: "variant-choco",
          variantTitle: "Chocolate",
          quantityPerCombo: 2,
        },
        {
          comboComponentId: "component-a",
          productId: "product-alfajor",
          productName: "Alfajor",
          variantId: "variant-maicena",
          variantTitle: "Maicena",
          quantityPerCombo: 1,
        },
      ],
      comboComponents: [
        {
          id: "component-a",
          productId: "product-alfajor",
          quantity: 3,
          product: {
            id: "product-alfajor",
            name: "Alfajor",
            sku: "ALF-BASE",
            variants: [
              {
                id: "variant-choco",
                sku: "ALF-CHOCO",
                title: "Chocolate",
              },
              {
                id: "variant-maicena",
                sku: "ALF-MAICENA",
                title: "Maicena",
              },
            ],
          },
        },
      ],
    })

    expect(snapshots).toEqual([
      expect.objectContaining({
        name: "Alfajor - Chocolate",
        sku: "ALF-CHOCO",
        quantityOrdered: 2,
      }),
      expect.objectContaining({
        name: "Alfajor - Maicena",
        sku: "ALF-MAICENA",
        quantityOrdered: 1,
      }),
    ])
  })
})
