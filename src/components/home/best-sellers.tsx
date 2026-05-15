"use client"

import Image from "next/image"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/format"
import { getProductPromotions } from "@/lib/product-promotions"
import {
  createAnalyticsItem,
  createEcommercePayload,
  trackSelectItem,
} from "@/lib/analytics"

interface Product {
  id: string
  name: string
  slug: string
  price: string
  comparePrice?: string | null
  discountType?: string | null
  discountConfig?: unknown
  hasVariants?: boolean
  isCombo?: boolean
  images?: { url: string }[]
}

interface BestSellersProps {
  products: Product[]
  enabled: boolean
}

export function BestSellers({ products, enabled }: BestSellersProps) {
  if (!enabled || products.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Nuestros Productos
          </h2>
          <h3 className="text-xl text-primary font-medium">
            Más Vendidos
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {products.map((product) => {
            const promotions = getProductPromotions(product)
            const visiblePromotions = promotions.slice(0, 2)
            const price = Number(product.price)
            const comparePrice = product.comparePrice ? Number(product.comparePrice) : null

            return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              onClick={() => {
                trackSelectItem(
                  createEcommercePayload([
                    createAnalyticsItem({
                      itemId: product.id,
                      itemName: product.name,
                      price: Number(product.price),
                      quantity: 1,
                    }),
                  ], {
                    value: Number(product.price),
                  })
                )
              }}
            >
              <div className="relative aspect-square bg-gray-100">
                {product.images && product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Sin imagen
                  </div>
                )}
                {(visiblePromotions.length > 0 || product.isCombo) && (
                  <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col gap-1">
                    {visiblePromotions.map((promotion) => (
                      <span
                        key={promotion.type}
                        className="w-fit rounded bg-primary px-2 py-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm"
                      >
                        {promotion.label}
                      </span>
                    ))}
                    {product.isCombo && (
                      <span className="w-fit rounded border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-semibold leading-none text-foreground shadow-sm">
                        Combo
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10 mb-1 leading-snug">
                  {product.name}
                </h3>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-primary font-bold">
                    {formatCurrency(price)}
                  </p>
                  {comparePrice !== null && comparePrice > price && (
                    <p className="text-xs text-gray-500 line-through">
                      {formatCurrency(comparePrice)}
                    </p>
                  )}
                </div>
                {promotions.some((promotion) => promotion.type === "variant_combo") && (
                  <p className="mt-1 text-[11px] font-medium text-primary">
                    Combinalas
                  </p>
                )}
                {product.isCombo && (
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    Elegi las variantes al comprar
                  </p>
                )}
              </div>
            </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
