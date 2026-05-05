import { formatCurrency } from "@/lib/utils"

type ProductPromotionInput = {
  price: number | string
  comparePrice?: number | string | null
  discountType?: string | null
  discountConfig?: unknown
  hasVariants?: boolean
}

export type ProductPromotion = {
  type: "compare_price" | "volume_fixed" | "variant_combo"
  label: string
  detail?: string
}

type VolumeFixedDiscountConfig = {
  threshold?: number | string
  value?: number | string
}

export function getProductPromotions(product: ProductPromotionInput): ProductPromotion[] {
  const promotions: ProductPromotion[] = []
  const price = Number(product.price)
  const comparePrice = product.comparePrice === null || product.comparePrice === undefined
    ? null
    : Number(product.comparePrice)

  if (comparePrice !== null && comparePrice > price) {
    const savings = comparePrice - price
    promotions.push({
      type: "compare_price",
      label: "Precio especial",
      detail: `Ahorrás ${formatCurrency(savings)}`,
    })
  }

  if (product.discountType === "VOLUME_FIXED") {
    const config = parseVolumeFixedDiscountConfig(product.discountConfig)
    if (config?.threshold && config?.value) {
      promotions.push({
        type: "volume_fixed",
        label: `Llevá ${config.threshold} y ahorrá ${formatCurrency(Number(config.value))}`,
        detail: "Descuento por cantidad",
      })

      if (product.hasVariants) {
        promotions.push({
          type: "variant_combo",
          label: "Combiná variantes",
          detail: "Suma sabores, talles o colores del mismo producto",
        })
      }
    }
  }

  return promotions
}

export function getPrimaryProductPromotion(product: ProductPromotionInput) {
  return getProductPromotions(product)[0] || null
}

export function parseVolumeFixedDiscountConfig(config: unknown): VolumeFixedDiscountConfig | null {
  let parsedConfig = config

  if (typeof config === "string") {
    try {
      parsedConfig = JSON.parse(config)
    } catch {
      return null
    }
  }

  if (!parsedConfig || typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) {
    return null
  }

  return parsedConfig as VolumeFixedDiscountConfig
}
