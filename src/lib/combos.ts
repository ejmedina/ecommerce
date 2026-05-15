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
    .sort((left, right) => left.comboComponentId.localeCompare(right.comboComponentId))
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
  return configuration.map((item) => {
    const totalQuantity = item.quantityPerCombo * comboQuantity
    const variantLabel = item.variantTitle ? ` - ${item.variantTitle}` : ""

    return `${totalQuantity} x ${item.productName}${variantLabel}`
  })
}
