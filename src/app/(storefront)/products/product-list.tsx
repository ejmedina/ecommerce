"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { QuantitySelector } from "@/components/ui/quantity-selector"
import { useCart } from "@/components/cart-context"
import { useToast } from "@/components/ui/use-toast"
import { getProductsAction } from "./actions"
import { Loader2 } from "lucide-react"
import { getProductPromotions } from "@/lib/product-promotions"
import {
  createAnalyticsItem,
  createEcommercePayload,
  trackAddToCart,
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
  comboRequiresConfiguration?: boolean
  category: { name: string } | null
  images: { url: string; alt: string | null }[]
  stock: number
  hasPermanentStock: boolean
  variants?: {
    id: string
    title: string | null
    sku: string | null
    stock: number
    price: string | null
  }[]
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
        {products.map((product, index) => {
          const promotions = getProductPromotions(product)
          const visiblePromotions = promotions.slice(0, 2)
          const price = Number(product.price)
          const comparePrice = product.comparePrice ? Number(product.comparePrice) : null

          return (
          <div key={product.id} className="group flex flex-col">
            <Link
              href={`/products/${product.slug}`}
              className="block"
              onClick={() => {
                trackSelectItem(
                  createEcommercePayload([
                    createAnalyticsItem({
                      itemId: product.id,
                      itemName: product.name,
                      price: Number(product.price),
                      quantity: 1,
                      itemCategory: product.category?.name || null,
                    }),
                  ], {
                    value: Number(product.price),
                  })
                )
              }}
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
                {(visiblePromotions.length > 0 || product.isCombo) && (
                  <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col gap-1">
                    {visiblePromotions.map((promotion) => (
                      <span
                        key={promotion.type}
                        className="w-fit rounded bg-primary px-2 py-1 text-[11px] font-semibold leading-none text-primary-foreground shadow-sm"
                      >
                        {promotion.label}
                      </span>
                    ))}
                    {product.isCombo && (
                      <span className="w-fit rounded border border-white/70 bg-white/90 px-2 py-1 text-[11px] font-semibold leading-none text-foreground shadow-sm">
                        Combo
                      </span>
                    )}
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10 mb-1 leading-snug">
                {product.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-lg font-semibold">
                  {formatCurrency(price)}
                </p>
                {comparePrice !== null && comparePrice > price && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatCurrency(comparePrice)}
                  </p>
                )}
              </div>
              {promotions.some((promotion) => promotion.type === "variant_combo") && (
                <p className="mt-1 text-xs font-medium text-primary">
                  Promo combinando variantes
                </p>
              )}
              {product.comboRequiresConfiguration && (
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Elegi opciones al agregar
                </p>
              )}
            </Link>
            <div className="mt-auto pt-3">
              {product.hasVariants ? (
                <VariantQuickAddDialog product={product} />
              ) : (
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  productSlug={product.slug}
                  requiresConfiguration={Boolean(product.comboRequiresConfiguration)}
                  className="w-full"
                  size="sm"
                />
              )}
            </div>
          </div>
          )
        })}
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

function VariantQuickAddDialog({ product }: { product: Product }) {
  const { cart, refreshCart, setIsOpen, updateItemQuantityOptimistic } = useCart()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [variantBusyId, setVariantBusyId] = useState<string | null>(null)
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({})

  const variants = useMemo(() => product.variants || [], [product.variants])
  const variantCartItems = useMemo(
    () =>
      new Map(
        (cart?.items || [])
          .filter((item) => item.productId === product.id && Boolean(item.variantId))
          .map((item) => [item.variantId as string, item])
      ),
    [cart?.items, product.id]
  )

  useEffect(() => {
    setDraftQuantities((current) => {
      const next = { ...current }
      for (const variant of variants) {
        if (!next[variant.id]) {
          next[variant.id] = 1
        }
      }
      return next
    })
  }, [variants])

  const updateDraftQuantity = (variantId: string, nextQuantity: number) => {
    setDraftQuantities((current) => ({
      ...current,
      [variantId]: nextQuantity,
    }))
  }

  const handleAddVariant = async (variantId: string) => {
    const variant = variants.find((item) => item.id === variantId)
    if (!variant) return

    const draftQuantity = draftQuantities[variantId] || 1
    setVariantBusyId(variantId)

    try {
      const formData = new FormData()
      formData.set("productId", product.id)
      formData.set("variantId", variantId)
      formData.set("quantity", draftQuantity.toString())

      const response = await fetch("/api/cart/add", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Error",
          description: result?.error || "No se pudo agregar la variante al carrito",
        })
        return
      }

      const variantPrice = Number(variant.price ?? product.price)
      trackAddToCart(
        createEcommercePayload([
          createAnalyticsItem({
            itemId: variant.id,
            itemName: variant.title ? `${product.name} - ${variant.title}` : product.name,
            price: variantPrice,
            quantity: draftQuantity,
            itemCategory: product.category?.name || null,
            itemVariant: variant.title || null,
          }),
        ], {
          value: variantPrice * draftQuantity,
        })
      )

      toast({
        title: "Agregado al carrito",
        description: variant.title ? `${product.name} - ${variant.title}` : product.name,
        variant: "success",
        duration: 3000,
      })

      await refreshCart()
      setIsOpen(true)
    } finally {
      setVariantBusyId(null)
    }
  }

  const handleUpdateVariantQuantity = async (variantId: string, newQuantity: number) => {
    const cartItem = variantCartItems.get(variantId)
    if (!cartItem) return

    if (newQuantity <= 0) {
      if (window.confirm("¿Seguro que querés eliminar esta variante del carrito?")) {
        setVariantBusyId(variantId)
        try {
          const response = await fetch(`/api/cart/items/${cartItem.id}`, { method: "DELETE" })
          if (!response.ok) {
            throw new Error("No se pudo eliminar la variante del carrito")
          }
          await refreshCart()
        } finally {
          setVariantBusyId(null)
        }
      }
      return
    }

    updateItemQuantityOptimistic(cartItem.id, newQuantity)
  }

  return (
    <>
      <Button className="w-full" size="sm" onClick={() => setOpen(true)}>
        Agregar al carrito
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              Elegí cantidad por variante y agregá directo al carrito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {variants.map((variant) => {
              const cartItem = variantCartItems.get(variant.id)
              const draftQuantity = draftQuantities[variant.id] || 1
              const variantPrice = Number(variant.price ?? product.price)
              const variantInStock = product.hasPermanentStock || variant.stock > 0
              const maxQuantity = product.hasPermanentStock ? undefined : variant.stock

              return (
                <div key={variant.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{variant.title || product.name}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatCurrency(variantPrice)}</span>
                        {variant.sku && <span>SKU: {variant.sku}</span>}
                        {product.hasPermanentStock ? (
                          <span className="font-medium text-green-600">En stock</span>
                        ) : variant.stock > 0 ? (
                          <span className="font-medium text-green-600">{variant.stock} disponibles</span>
                        ) : (
                          <span className="font-medium text-red-600">Sin stock</span>
                        )}
                      </div>
                    </div>

                    {cartItem ? (
                      <QuantitySelector
                        value={cartItem.quantity}
                        onChange={(nextQuantity) => handleUpdateVariantQuantity(variant.id, nextQuantity)}
                        min={0}
                        max={maxQuantity}
                        disabled={variantBusyId === variant.id}
                        size="default"
                      />
                    ) : (
                      <div className="flex gap-3">
                        <QuantitySelector
                          value={draftQuantity}
                          onChange={(nextQuantity) => updateDraftQuantity(variant.id, nextQuantity)}
                          min={1}
                          max={maxQuantity}
                          disabled={variantBusyId === variant.id || !variantInStock}
                          size="default"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAddVariant(variant.id)}
                          disabled={variantBusyId === variant.id || !variantInStock}
                        >
                          {variantBusyId === variant.id ? "Agregando..." : "Agregar"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
