export interface CartComboConfigurationItem {
  comboComponentId: string
  productId: string
  productName: string
  variantId: string | null
  variantTitle: string | null
  quantityPerCombo: number
}

export type CartComboConfiguration = CartComboConfigurationItem[]

export function buildComboSelectionSignature(
  configuration: CartComboConfiguration
) {
  return [...configuration]
    .sort((left, right) => {
      const byComponent = left.comboComponentId.localeCompare(right.comboComponentId)
      if (byComponent !== 0) return byComponent
      return (left.variantId ?? "base").localeCompare(right.variantId ?? "base")
    })
    .map((item) =>
      [
        item.comboComponentId,
        item.productId,
        item.variantId ?? "base",
        item.quantityPerCombo,
      ].join(":")
    )
    .join("|")
}

export function getOperationalDemandKey(input: {
  productId: string
  variantId?: string | null
}) {
  return input.variantId
    ? `variant:${input.variantId}`
    : `product:${input.productId}`
}

export function summarizeComboConfiguration(
  configuration: CartComboConfiguration,
  comboQuantity = 1
) {
  const grouped = new Map<string, { label: string; quantity: number }>()

  for (const item of configuration) {
    const totalQuantity = item.quantityPerCombo * comboQuantity
    const variantLabel = item.variantTitle ? ` - ${item.variantTitle}` : ""
    const label = `${item.productName}${variantLabel}`
    const existing = grouped.get(label)

    if (existing) {
      existing.quantity += totalQuantity
      continue
    }

    grouped.set(label, {
      label,
      quantity: totalQuantity,
    })
  }

  return [...grouped.values()].map((item) => `${item.quantity} x ${item.label}`)
}
