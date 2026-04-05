export type DiscountType = "NONE" | "COMPARE_PRICE" | "VOLUME_FIXED"

export interface CartPricingItem {
  id: string
  quantity: number
  productId: string
  product: {
    id: string
    name: string
    price: number
    discountType?: string | null
    discountConfig?: any | null
  }
  variant?: {
    price: number | null
  } | null
}

export interface PricingResult {
  rawSubtotal: number
  discountAmount: number
  totalToPay: number
  discounts: {
    productId: string
    description: string
    amount: number
  }[]
}

export function calculateCartPricing(items: CartPricingItem[]): PricingResult {
  let rawSubtotal = 0
  
  // Agrupar por producto para evaluar descuentos de volumen que cruzan variantes
  const productGroups: Record<string, {
    name: string
    quantity: number
    discountType: DiscountType
    discountConfig: any
  }> = {}

  for (const item of items) {
    // Resolver precio (la variante puede tener precio propio, sino usar base)
    const itemPrice = item.variant?.price !== null && item.variant?.price !== undefined
      ? Number(item.variant.price)
      : Number(item.product.price)
      
    // Sumar al total base
    const itemTotal = itemPrice * item.quantity
    rawSubtotal += itemTotal
    
    // Registrar para evaluación de descuentos
    const dType = (item.product.discountType as DiscountType) || "NONE"
    
    if (!productGroups[item.productId]) {
      productGroups[item.productId] = {
        name: item.product.name,
        quantity: 0,
        discountType: dType,
        discountConfig: item.product.discountConfig
      }
    }
    productGroups[item.productId].quantity += item.quantity
  }

  let totalDiscountValue = 0
  const appliedDiscounts = []

  // Evaluar promociones por agrupación
  for (const [productId, group] of Object.entries(productGroups)) {
    if (group.discountType === "VOLUME_FIXED" && group.discountConfig) {
      const config = typeof group.discountConfig === "string" 
        ? JSON.parse(group.discountConfig) 
        : group.discountConfig
        
      const threshold = Number(config.threshold) || 2
      const value = Number(config.value) || 0
      
      const applicablePairs = Math.floor(group.quantity / threshold)
      
      if (applicablePairs > 0) {
        const discountAmount = applicablePairs * value
        totalDiscountValue += discountAmount
        appliedDiscounts.push({
          productId,
          description: `Promo llevando ${threshold}x o más en ${group.name}`,
          amount: discountAmount
        })
      }
    }
    // NOTA: Acá se pueden agregar más ifs para PERCENTAGE, BOGO(2x1 completo), etc.
  }

  return {
    rawSubtotal,
    discountAmount: totalDiscountValue,
    totalToPay: rawSubtotal - totalDiscountValue,
    discounts: appliedDiscounts
  }
}
