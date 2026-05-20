import { type CartComboConfiguration } from "@/lib/combos"

type ComboComponentSourceVariant = {
  id: string
  sku: string | null
  title: string | null
}

type ComboComponentSourceProduct = {
  id: string
  name: string
  sku: string | null
  variants: ComboComponentSourceVariant[]
}

type ComboComponentSource = {
  id: string
  productId: string
  quantity: number
  product: ComboComponentSourceProduct
}

export function buildOrderItemComponentSnapshots(input: {
  configuration: CartComboConfiguration
  comboComponents: ComboComponentSource[]
  comboQuantity: number
}) {
  const { configuration, comboComponents, comboQuantity } = input
  const sourceByComponentId = new Map(
    comboComponents.map((component) => [component.id, component])
  )

  return configuration.map((selectedItem, index) => {
    const sourceComponent = sourceByComponentId.get(selectedItem.comboComponentId)
    if (!sourceComponent) {
      throw new Error("No se encontro el componente del combo al crear el pedido.")
    }

    const sourceVariant = selectedItem.variantId
      ? sourceComponent.product.variants.find((variant) => variant.id === selectedItem.variantId)
      : null

    if (selectedItem.variantId && !sourceVariant) {
      throw new Error("La variante elegida para el combo ya no esta disponible.")
    }

    return {
      productId: selectedItem.productId,
      variantId: selectedItem.variantId,
      comboComponentId: selectedItem.comboComponentId,
      name: sourceVariant?.title
        ? `${sourceComponent.product.name} - ${sourceVariant.title}`
        : sourceComponent.product.name,
      sku: sourceVariant?.sku || sourceComponent.product.sku,
      quantityPerCombo: selectedItem.quantityPerCombo,
      comboQuantity,
      quantityOrdered: selectedItem.quantityPerCombo * comboQuantity,
      position: index,
    }
  })
}
