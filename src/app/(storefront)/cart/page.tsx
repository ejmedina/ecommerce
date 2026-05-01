"use client"

import Link from "next/link"
import Image from "next/image"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useCart } from "@/components/cart-context"
import { QuantitySelector } from "@/components/ui/quantity-selector"

interface CartPageItem {
  id: string
  quantity: number
  variant?: {
    title?: string | null
    price?: number | string | null
  } | null
  product: {
    id: string
    slug?: string | null
    name: string
    price: number | string
    sku?: string | null
    images?: { url: string }[]
  }
}

export default function CartPage() {
  const { cart, settings, updateItemQuantityOptimistic, isSyncing, refreshCart } = useCart()

  if (!cart) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-8">
          Agregá productos para comenzar tu compra
        </p>
        <Button asChild>
          <Link href="/products">Ver productos</Link>
        </Button>
      </div>
    )
  }

  const subtotal = cart.pricingResult?.rawSubtotal || 0
  const itemCount = cart.items.reduce((sum: number, item: CartPageItem) => sum + item.quantity, 0)
  const appliedDiscounts = cart.pricingResult?.discounts || []
  const totalToPay = cart.pricingResult?.totalToPay || 0

  const handleUpdate = (itemId: string, newQty: number) => {
    if (newQty < 1) return
    updateItemQuantityOptimistic(itemId, newQty)
  }

  const handleRemove = async (itemId: string) => {
    if (window.confirm("¿Seguro que querés eliminar este producto?")) {
      try {
        await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" })
        await refreshCart()
      } catch (error) {
        console.error("Error eliminando item:", error)
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Carrito ({itemCount})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item: CartPageItem) => {
            const currentPrice = item.variant?.price ? Number(item.variant.price) : Number(item.product.price)
            
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative w-24 h-24 shrink-0 rounded-md bg-muted overflow-hidden">
                      {item.product.images?.[0] ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.slug || item.product.id}`}
                        className="font-medium hover:underline line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant?.title && (
                        <p className="text-sm text-muted-foreground">
                          {item.variant.title}
                        </p>
                      )}
                      {item.product.sku && !item.variant && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.product.sku}
                        </p>
                      )}
                      <p className="font-semibold mt-1">
                        {formatCurrency(currentPrice)}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(val) => handleUpdate(item.id, val)}
                        size="sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive mt-auto"
                        onClick={() => handleRemove(item.id)}
                        disabled={isSyncing}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              
              {appliedDiscounts.map((discount, i) => (
                <div key={i} className="flex justify-between text-sm text-green-600 font-medium">
                  <span>{discount.description}</span>
                  <span>-{formatCurrency(discount.amount)}</span>
                </div>
              ))}

              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span>Calculado en checkout</span>
              </div>
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalToPay)}</span>
              </div>
              {settings?.minShippingOrderAmount > 0 && subtotal < settings.minShippingOrderAmount && (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                    <p className="font-medium">Mínimo para envío a domicilio</p>
                    <p>Te faltan <strong>{formatCurrency(settings.minShippingOrderAmount - subtotal)}</strong> para alcanzar el mínimo de {formatCurrency(settings.minShippingOrderAmount)}.</p>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-900">
                    <p className="font-medium">También podés retirar en tienda</p>
                    <p>El retiro en tienda no tiene compra mínima.</p>
                  </div>
                </div>
              )}
              <Button 
                asChild={!isSyncing} 
                className="w-full" 
                size="lg"
                disabled={isSyncing}
                onClick={(e) => {
                  if (isSyncing) e.preventDefault()
                }}
              >
                {isSyncing ? "Actualizando..." : <Link href="/checkout">Continuar compra</Link>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
