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

function buildDefaultComboConfiguration(
  product: ComboValidationProduct
): CartComboConfiguration {
  return product.comboComponents.map((component) => {
    if (component.product.hasVariants) {
      throw new Error(`Elegi una variante para ${component.product.name}.`)
    }

    return {
      comboComponentId: component.id,
      productId: component.productId,
      productName: component.product.name,
      variantId: null,
      variantTitle: null,
      quantityPerCombo: component.quantity,
    }
  })
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

function sumQuantityPerCombo(configuration: CartComboConfiguration) {
  return configuration.reduce((sum, item) => sum + item.quantityPerCombo, 0)
}

export function parseCartComboConfiguration(
  value: FormDataEntryValue | string | null | undefined
): CartComboConfiguration {
  if (!value || typeof value !== "string") {
    return []
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

  const requestedConfiguration = Array.isArray(rawConfiguration) && rawConfiguration.length === 0
    ? buildDefaultComboConfiguration(product)
    : ensureCartComboConfiguration(rawConfiguration)
  const selectedByComponentId = new Map<string, CartComboConfiguration>()
  for (const item of requestedConfiguration) {
    const existing = selectedByComponentId.get(item.comboComponentId) ?? []
    existing.push(item)
    selectedByComponentId.set(item.comboComponentId, existing)
  }

  const normalizedConfiguration: CartComboConfiguration = []
  let availableStock: number | null = null

  for (const component of product.comboComponents) {
    const selectedItems = selectedByComponentId.get(component.id) ?? []

    if (selectedItems.length === 0) {
      throw new Error("Faltan opciones por elegir en el combo.")
    }

    if (selectedItems.some((selectedItem) => selectedItem.productId !== component.productId)) {
      throw new Error("La configuracion del combo no coincide con sus productos.")
    }

    const componentProduct = component.product
    if (componentProduct.hasVariants) {
      const requestedComponentQuantity = sumQuantityPerCombo(selectedItems)
      if (requestedComponentQuantity !== component.quantity) {
        throw new Error(`Asigná exactamente ${component.quantity} unidad${component.quantity === 1 ? "" : "es"} para ${componentProduct.name}.`)
      }

      const selectedVariantIds = new Set<string>()
      for (const selectedItem of selectedItems) {
        if (!selectedItem.variantId) {
          throw new Error(`Elegi una variante para ${componentProduct.name}.`)
        }

        if (selectedItem.quantityPerCombo <= 0) {
          throw new Error(`La cantidad elegida para ${componentProduct.name} no es valida.`)
        }

        if (selectedVariantIds.has(selectedItem.variantId)) {
          throw new Error(`No repitas la misma variante en ${componentProduct.name}; ajustá la cantidad directamente.`)
        }
        selectedVariantIds.add(selectedItem.variantId)

        const selectedVariant = componentProduct.variants.find(
          (variant) => variant.id === selectedItem.variantId
        )

        if (!selectedVariant) {
          throw new Error(`La variante elegida para ${componentProduct.name} ya no existe.`)
        }

        if (!componentProduct.hasPermanentStock) {
          const componentStock = Math.floor(selectedVariant.stock / selectedItem.quantityPerCombo)
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
          quantityPerCombo: selectedItem.quantityPerCombo,
        })
      }
      continue
    }

    const selectedItem = selectedItems[0]

    if (selectedItems.length > 1) {
      throw new Error(`${componentProduct.name} no requiere multiples selecciones.`)
    }

    if (selectedItem.variantId) {
      throw new Error(`${componentProduct.name} no requiere elegir variante.`)
    }

    if (selectedItem.quantityPerCombo !== component.quantity) {
      throw new Error(`La cantidad de ${componentProduct.name} debe ser ${component.quantity}.`)
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
