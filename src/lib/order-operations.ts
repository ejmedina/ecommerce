import { getOperationalDemandKey } from "@/lib/combos"

type OperationalComponent = {
  id: string
  orderItemId?: string
  productId: string
  variantId?: string | null
  name: string
  quantityOrdered: number
  quantityFulfilled?: number | null
  quantityMissing?: number | null
  missingReason?: string | null
  fulfilledAt?: Date | string | null
  quantityPerCombo?: number
}

type OperationalOrderItem = {
  id: string
  itemType?: "PRODUCT" | "COMBO" | string
  productId: string
  variantId?: string | null
  name: string
  quantityOrdered: number
  quantityFulfilled?: number | null
  quantityMissing?: number | null
  missingReason?: string | null
  fulfilledAt?: Date | string | null
  components?: OperationalComponent[]
}

export type OperationalRow = {
  targetType: "ORDER_ITEM" | "ORDER_ITEM_COMPONENT"
  targetId: string
  orderItemId: string
  productId: string
  variantId: string | null
  name: string
  quantityOrdered: number
  quantityFulfilled: number
  quantityMissing: number
  missingReason: string | null
  fulfilledAt: Date | string | null
  summaryKey: string
}

export function resolveOperationalQuantities(input: {
  quantityOrdered: number
  quantityFulfilled?: number | null
  quantityMissing?: number | null
  fulfilledAt?: Date | string | null
}) {
  const ordered = input.quantityOrdered
  const fulfilled = input.fulfilledAt
    ? input.quantityFulfilled ?? Math.max(ordered - (input.quantityMissing ?? 0), 0)
    : ordered
  const missing = input.quantityMissing ?? Math.max(ordered - fulfilled, 0)

  return {
    fulfilled: Math.max(0, fulfilled),
    missing: Math.max(0, missing),
  }
}

export function flattenOrderItemsForOperations(items: OperationalOrderItem[]): OperationalRow[] {
  return items.flatMap((item) => {
    if (item.itemType === "COMBO" && item.components && item.components.length > 0) {
      return item.components.map((component) => {
        const quantities = resolveOperationalQuantities(component)

        return {
          targetType: "ORDER_ITEM_COMPONENT" as const,
          targetId: component.id,
          orderItemId: item.id,
          productId: component.productId,
          variantId: component.variantId ?? null,
          name: component.name,
          quantityOrdered: component.quantityOrdered,
          quantityFulfilled: quantities.fulfilled,
          quantityMissing: quantities.missing,
          missingReason: component.missingReason ?? null,
          fulfilledAt: component.fulfilledAt ?? null,
          summaryKey: getOperationalDemandKey({
            productId: component.productId,
            variantId: component.variantId ?? null,
          }),
        }
      })
    }

    const quantities = resolveOperationalQuantities(item)
    return [{
      targetType: "ORDER_ITEM" as const,
      targetId: item.id,
      orderItemId: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      name: item.name,
      quantityOrdered: item.quantityOrdered,
      quantityFulfilled: quantities.fulfilled,
      quantityMissing: quantities.missing,
      missingReason: item.missingReason ?? null,
      fulfilledAt: item.fulfilledAt ?? null,
      summaryKey: getOperationalDemandKey({
        productId: item.productId,
        variantId: item.variantId ?? null,
      }),
    }]
  })
}

export function getComboOrderFulfillmentFromComponents(item: {
  quantityOrdered: number
  components: Array<Pick<OperationalComponent, "quantityOrdered" | "quantityFulfilled" | "quantityMissing" | "fulfilledAt" | "quantityPerCombo" | "missingReason">>
}) {
  if (item.components.length === 0) {
    return {
      quantityFulfilled: item.quantityOrdered,
      quantityMissing: 0,
      missingReason: null,
    }
  }

  const fulfilledCombos = item.components.reduce((currentMin, component) => {
    const { fulfilled } = resolveOperationalQuantities({
      quantityOrdered: component.quantityOrdered,
      quantityFulfilled: component.quantityFulfilled,
      quantityMissing: component.quantityMissing,
      fulfilledAt: component.fulfilledAt,
    })

    const quantityPerCombo = Math.max(1, component.quantityPerCombo ?? 1)
    const combosFromComponent = Math.floor(fulfilled / quantityPerCombo)
    return Math.min(currentMin, combosFromComponent)
  }, Number.POSITIVE_INFINITY)

  const quantityFulfilled = Number.isFinite(fulfilledCombos)
    ? Math.min(item.quantityOrdered, fulfilledCombos)
    : item.quantityOrdered
  const quantityMissing = Math.max(item.quantityOrdered - quantityFulfilled, 0)
  const missingReason = item.components.find((component) => (component.quantityMissing ?? 0) > 0)?.missingReason ?? null

  return {
    quantityFulfilled,
    quantityMissing,
    missingReason,
  }
}
