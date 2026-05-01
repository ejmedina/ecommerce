"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { getProductsAction } from "./actions"
import { Loader2 } from "lucide-react"

interface Product {
  id: string
  name: string
  slug: string
  price: string
  comparePrice?: string | null
  category: { name: string } | null
  images: { url: string; alt: string | null }[]
  stock: number
  hasPermanentStock: boolean
}

interface ProductListProps {
  initialProducts: Product[]
  initialHasMore: boolean
  category?: string
  s?: string
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc"
}

export function ProductList({ initialProducts, initialHasMore, category, s, sort = "newest" }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    const nextPage = page + 1
    
    try {
      const result = await getProductsAction({
        category,
        s,
        sort,
        page: nextPage,
        limit: 12
      })

      setProducts(prev => [...prev, ...result.products])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoading(false)
    }
  }, [page, hasMore, loading, category, s, sort])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loadMore, hasMore])

  // Reset products when filters change (initialProducts changes)
  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialHasMore)
    setPage(1)
  }, [initialProducts, initialHasMore])

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product, index) => (
          <div key={product.id} className="group flex flex-col">
            <Link
              href={`/products/${product.slug}`}
              className="block"
            >
              <div className="relative aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    fill
                    priority={index < 4}
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    Sin imagen
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10 mb-1 leading-snug">
                {product.name}
              </h3>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(Number(product.price))}
              </p>
            </Link>
            <div className="mt-auto pt-3">
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                className="w-full"
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Observer Target */}
      <div ref={observerTarget} className="h-20 flex items-center justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando más productos...</span>
          </div>
        )}
      </div>
    </div>
  )
}
