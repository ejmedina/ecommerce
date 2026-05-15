import {
  getComboOrderFulfillmentFromComponents,
  resolveOperationalQuantities,
} from "@/lib/order-operations"

type CommercialOrderItemComponent = {
  id: string
  orderItemId?: string
  productId?: string
  variantId?: string | null
  name: string
  quantityOrdered: number
  quantityFulfilled?: number | null
  quantityMissing?: number | null
  missingReason?: string | null
  fulfilledAt?: Date | string | null
  quantityPerCombo?: number
}

type CommercialOrderItemInput = {
  id: string
  itemType?: "PRODUCT" | "COMBO" | string
  name: string
  sku?: string | null
  quantityOrdered?: number | null
  quantity?: number | null
  price?: number | string | null
  unitTotal?: number | string | null
  quantityFulfilled?: number | null
  quantityMissing?: number | null
  missingReason?: string | null
  fulfilledAt?: Date | string | null
  components?: CommercialOrderItemComponent[]
}

export type CommercialOrderDisplayComponent = {
  id: string
  name: string
  quantityOrdered: number
  quantityFulfilled: number
  quantityMissing: number
  missingReason: string | null
}

export type CommercialOrderDisplayItem = {
  id: string
  itemType: "PRODUCT" | "COMBO"
  name: string
  sku: string | null
  quantityOrdered: number
  price: number | null
  unitTotal: number | null
  quantityFulfilled: number
  quantityMissing: number
  missingReason: string | null
  components: CommercialOrderDisplayComponent[]
}

export function getCommercialOrderItems(
  items: CommercialOrderItemInput[]
): CommercialOrderDisplayItem[] {
  return items.map((item) => {
    const quantityOrdered = item.quantityOrdered ?? item.quantity ?? 0
    const itemType = item.itemType === "COMBO" ? "COMBO" : "PRODUCT"

    if (itemType === "COMBO" && item.components && item.components.length > 0) {
      const components = item.components.map((component) => {
        const quantities = resolveOperationalQuantities(component)

        return {
          id: component.id,
          name: component.name,
          quantityOrdered: component.quantityOrdered,
          quantityFulfilled: quantities.fulfilled,
          quantityMissing: quantities.missing,
          missingReason: component.missingReason ?? null,
        }
      })

      const comboFulfillment = getComboOrderFulfillmentFromComponents({
        quantityOrdered,
        components: item.components,
      })

      return {
        id: item.id,
        itemType,
        name: item.name,
        sku: item.sku ?? null,
        quantityOrdered,
        price: item.price !== undefined && item.price !== null ? Number(item.price) : null,
        unitTotal: item.unitTotal !== undefined && item.unitTotal !== null ? Number(item.unitTotal) : null,
        quantityFulfilled: comboFulfillment.quantityFulfilled,
        quantityMissing: comboFulfillment.quantityMissing,
        missingReason: comboFulfillment.missingReason,
        components,
      }
    }

    const quantities = resolveOperationalQuantities({
      quantityOrdered,
      quantityFulfilled: item.quantityFulfilled,
      quantityMissing: item.quantityMissing,
      fulfilledAt: item.fulfilledAt,
    })

    return {
      id: item.id,
      itemType,
      name: item.name,
      sku: item.sku ?? null,
      quantityOrdered,
      price: item.price !== undefined && item.price !== null ? Number(item.price) : null,
      unitTotal: item.unitTotal !== undefined && item.unitTotal !== null ? Number(item.unitTotal) : null,
      quantityFulfilled: quantities.fulfilled,
      quantityMissing: quantities.missing,
      missingReason: item.missingReason ?? null,
      components: [],
    }
  })
}

export function getCommercialOrderUnitCount(items: CommercialOrderItemInput[]) {
  return items.reduce((sum, item) => sum + (item.quantityOrdered ?? item.quantity ?? 0), 0)
}
