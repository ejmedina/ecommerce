import { describe, expect, it } from 'vitest'
import { calculateCartPricing, type CartPricingItem } from './pricing'

describe('calculateCartPricing', () => {
  it('applies volume fixed discounts across mixed variants of the same product', () => {
    const product = {
      id: 'madalenas',
      name: 'Madalenas',
      price: 2690,
      discountType: 'VOLUME_FIXED',
      discountConfig: { threshold: 2, value: 180 },
    }

    const items: CartPricingItem[] = [
      {
        id: 'item-vainilla',
        productId: product.id,
        quantity: 1,
        product,
        variant: { price: 2690 },
      },
      {
        id: 'item-vainilla-ddl',
        productId: product.id,
        quantity: 2,
        product,
        variant: { price: 2690 },
      },
      {
        id: 'item-chocolate-ddl',
        productId: product.id,
        quantity: 1,
        product,
        variant: { price: 2690 },
      },
    ]

    const result = calculateCartPricing(items)

    expect(result.rawSubtotal).toBe(10760)
    expect(result.discountAmount).toBe(360)
    expect(result.totalToPay).toBe(10400)
    expect(result.discounts).toEqual([
      {
        productId: 'madalenas',
        description: 'Promo llevando 2x o más en Madalenas',
        amount: 360,
      },
    ])
  })
})
