import { describe, expect, it } from 'vitest'
import { getProductPromotions } from './product-promotions'

describe('getProductPromotions', () => {
  it('detects compare price promotions', () => {
    const promotions = getProductPromotions({
      price: 5200,
      comparePrice: 5380,
    })

    expect(promotions[0]?.type).toBe('compare_price')
    expect(promotions[0]?.label).toBe('Precio especial')
  })

  it('detects volume discounts and variant combos', () => {
    const promotions = getProductPromotions({
      price: 2690,
      discountType: 'VOLUME_FIXED',
      discountConfig: { threshold: 2, value: 180 },
      hasVariants: true,
    })

    expect(promotions.map((promotion) => promotion.type)).toEqual([
      'volume_fixed',
      'variant_combo',
    ])
    expect(promotions[0]?.label).toContain('Llevá 2')
  })
})
