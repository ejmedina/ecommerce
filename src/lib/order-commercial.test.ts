import { describe, expect, it } from "vitest"
import { getCommercialOrderItems, getCommercialOrderUnitCount } from "@/lib/order-commercial"

describe("order commercial helpers", () => {
  it("keeps combo revenue on the parent item while deriving fulfillment from components", () => {
    const items = getCommercialOrderItems([
      {
        id: "combo-1",
        itemType: "COMBO",
        name: "Combo Merienda",
        quantityOrdered: 2,
        unitTotal: 12000,
        components: [
          {
            id: "component-1",
            name: "Cafe - 250g",
            quantityOrdered: 2,
            quantityFulfilled: 2,
            quantityPerCombo: 1,
            fulfilledAt: new Date().toISOString(),
          },
          {
            id: "component-2",
            name: "Medialunas",
            quantityOrdered: 12,
            quantityFulfilled: 6,
            quantityMissing: 6,
            quantityPerCombo: 6,
            missingReason: "Sin stock",
            fulfilledAt: new Date().toISOString(),
          },
        ],
      },
    ])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      itemType: "COMBO",
      quantityOrdered: 2,
      quantityFulfilled: 1,
      quantityMissing: 1,
      missingReason: "Sin stock",
      unitTotal: 12000,
    })
    expect(items[0].components).toEqual([
      {
        id: "component-1",
        name: "Cafe - 250g",
        quantityOrdered: 2,
        quantityFulfilled: 2,
        quantityMissing: 0,
        missingReason: null,
      },
      {
        id: "component-2",
        name: "Medialunas",
        quantityOrdered: 12,
        quantityFulfilled: 6,
        quantityMissing: 6,
        missingReason: "Sin stock",
      },
    ])
  })

  it("counts commercial units without exploding combo components", () => {
    expect(
      getCommercialOrderUnitCount([
        { id: "combo-1", itemType: "COMBO", name: "Combo", quantityOrdered: 2 },
        { id: "product-1", name: "Pan", quantityOrdered: 3 },
      ])
    ).toBe(5)
  })
})
