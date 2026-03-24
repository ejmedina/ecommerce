"use client"

import Image from "next/image"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/format"

interface Product {
  id: string
  name: string
  slug: string
  price: string
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
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                  {product.name}
                </h3>
                <p className="text-primary font-bold">
                  {formatCurrency(Number(product.price))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
