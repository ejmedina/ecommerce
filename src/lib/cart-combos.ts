import {
  buildComboSelectionSignature,
  type CartComboConfiguration,
} from "@/lib/combos"

type ComboValidationVariant = {
  id: string
  title: string | null
  stock: number
}

type ComboValidationComponentProduct = {
  id: string
  name: string
  hasVariants: boolean
  hasPermanentStock: boolean
  stock: number
  variants: ComboValidationVariant[]
}

type ComboValidationComponent = {
  id: string
  productId: string
  quantity: number
  product: ComboValidationComponentProduct
}

type ComboValidationProduct = {
  isCombo: boolean
  comboComponents: ComboValidationComponent[]
}

function ensureCartComboConfiguration(
  value: unknown
): CartComboConfiguration {
  if (!Array.isArray(value)) {
    throw new Error("Configuracion de combo invalida.")
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Configuracion de combo invalida.")
    }

    const item = entry as Record<string, unknown>

    return {
      comboComponentId: typeof item.comboComponentId === "string" ? item.comboComponentId : "",
      productId: typeof item.productId === "string" ? item.productId : "",
      productName: typeof item.productName === "string" ? item.productName : "",
      variantId: typeof item.variantId === "string" ? item.variantId : null,
      variantTitle: typeof item.variantTitle === "string" ? item.variantTitle : null,
      quantityPerCombo: Number(item.quantityPerCombo) || 0,
    }
  })
}

export function parseCartComboConfiguration(
  value: FormDataEntryValue | string | null | undefined
): CartComboConfiguration {
  if (!value || typeof value !== "string") {
    throw new Error("Falta la configuracion del combo.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error("Configuracion de combo invalida.")
  }

  return ensureCartComboConfiguration(parsed)
}

export function validateComboCartSelection(input: {
  product: ComboValidationProduct
  rawConfiguration: unknown
  quantity: number
}) {
  const { product, rawConfiguration, quantity } = input

  if (!product.isCombo) {
    throw new Error("El producto no es un combo.")
  }

  const requestedConfiguration = ensureCartComboConfiguration(rawConfiguration)
  const selectedByComponentId = new Map(
    requestedConfiguration.map((item) => [item.comboComponentId, item])
  )

  if (selectedByComponentId.size !== requestedConfiguration.length) {
    throw new Error("La configuracion del combo tiene productos repetidos.")
  }

  const normalizedConfiguration: CartComboConfiguration = []
  let availableStock: number | null = null

  for (const component of product.comboComponents) {
    const selectedItem = selectedByComponentId.get(component.id)

    if (!selectedItem) {
      throw new Error("Faltan opciones por elegir en el combo.")
    }

    if (selectedItem.productId !== component.productId) {
      throw new Error("La configuracion del combo no coincide con sus productos.")
    }

    const componentProduct = component.product
    if (componentProduct.hasVariants) {
      if (!selectedItem.variantId) {
        throw new Error(`Elegi una variante para ${componentProduct.name}.`)
      }

      const selectedVariant = componentProduct.variants.find(
        (variant) => variant.id === selectedItem.variantId
      )

      if (!selectedVariant) {
        throw new Error(`La variante elegida para ${componentProduct.name} ya no existe.`)
      }

      if (!componentProduct.hasPermanentStock) {
        const componentStock = Math.floor(selectedVariant.stock / component.quantity)
        availableStock = availableStock === null
          ? componentStock
          : Math.min(availableStock, componentStock)
      }

      normalizedConfiguration.push({
        comboComponentId: component.id,
        productId: component.productId,
        productName: componentProduct.name,
        variantId: selectedVariant.id,
        variantTitle: selectedVariant.title,
        quantityPerCombo: component.quantity,
      })
      continue
    }

    if (selectedItem.variantId) {
      throw new Error(`${componentProduct.name} no requiere elegir variante.`)
    }

    if (!componentProduct.hasPermanentStock) {
      const componentStock = Math.floor(componentProduct.stock / component.quantity)
      availableStock = availableStock === null
        ? componentStock
        : Math.min(availableStock, componentStock)
    }

    normalizedConfiguration.push({
      comboComponentId: component.id,
      productId: component.productId,
      productName: componentProduct.name,
      variantId: null,
      variantTitle: null,
      quantityPerCombo: component.quantity,
    })
  }

  if (requestedConfiguration.length !== normalizedConfiguration.length) {
    throw new Error("La configuracion del combo incluye productos inesperados.")
  }

  if (availableStock !== null && quantity > availableStock) {
    throw new Error("No hay suficiente stock para armar esa cantidad de combos.")
  }

  return {
    configuration: normalizedConfiguration,
    selectionSignature: buildComboSelectionSignature(normalizedConfiguration),
    availableStock,
  }
}
