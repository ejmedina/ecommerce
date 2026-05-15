import { describe, expect, it } from "vitest"
import {
  flattenOrderItemsForOperations,
  getComboOrderFulfillmentFromComponents,
} from "./order-operations"

describe("order operations", () => {
  it("flattens combo components into operational rows", () => {
    const rows = flattenOrderItemsForOperations([
      {
        id: "order-item-1",
        itemType: "COMBO",
        productId: "combo-1",
        name: "Combo desayuno",
        quantityOrdered: 2,
        components: [
          {
            id: "component-1",
            orderItemId: "order-item-1",
            productId: "medialuna",
            variantId: null,
            name: "Medialuna",
            quantityOrdered: 12,
            quantityFulfilled: 10,
            quantityMissing: 2,
            fulfilledAt: new Date(),
            quantityPerCombo: 6,
          },
        ],
      },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(expect.objectContaining({
      targetType: "ORDER_ITEM_COMPONENT",
      targetId: "component-1",
      quantityOrdered: 12,
      quantityMissing: 2,
      summaryKey: "product:medialuna",
    }))
  })

  it("derives combo fulfillment from component fulfillment", () => {
    const summary = getComboOrderFulfillmentFromComponents({
      quantityOrdered: 2,
      components: [
        {
          quantityOrdered: 12,
          quantityFulfilled: 10,
          quantityMissing: 2,
          fulfilledAt: new Date(),
          quantityPerCombo: 6,
          missingReason: "Faltaron 2",
        },
        {
          quantityOrdered: 2,
          quantityFulfilled: 2,
          quantityMissing: 0,
          fulfilledAt: new Date(),
          quantityPerCombo: 1,
          missingReason: null,
        },
      ],
    })

    expect(summary).toEqual({
      quantityFulfilled: 1,
      quantityMissing: 1,
      missingReason: "Faltaron 2",
    })
  })
})
