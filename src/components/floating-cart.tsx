"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { X, Trash2, ShoppingBag } from "lucide-react"
import { useCart } from "@/components/cart-context"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { QuantitySelector } from "@/components/ui/quantity-selector"

export function FloatingCart() {
  const { cart, isOpen, setIsOpen, refreshCart, pricingResult, settings, updateItemQuantityOptimistic, isSyncing } = useCart()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  if (!isOpen) return null

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    updateItemQuantityOptimistic(itemId, newQuantity)
  }

  const removeItem = async (itemId: string) => {
    setIsRemoving(itemId)
    try {
      await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      })
      await refreshCart()
    } finally {
      setIsRemoving(null)
    }
  }

  const rawSubtotal = pricingResult?.rawSubtotal || 0
  const totalToPay = pricingResult?.totalToPay || 0
  const appliedDiscounts = pricingResult?.discounts || []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Cart Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Carrito
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {(!cart || cart.items.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 border rounded-lg"
                >
                  {/* Image */}
                  <div className="relative w-20 h-20 bg-muted rounded overflow-hidden shrink-0">
                    {item.product.images[0] ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.images[0].alt || item.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="font-medium text-sm truncate block hover:underline"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm font-semibold mt-1">
                      {formatCurrency(Number(item.product.price))}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(val) => updateQuantity(item.id, val)}
                        size="sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-auto text-destructive"
                        onClick={() => {
                          if (window.confirm("¿Seguro que querés eliminar este producto?")) {
                            removeItem(item.id)
                          }
                        }}
                        disabled={isRemoving === item.id}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(rawSubtotal)}</span>
              </div>
              
              {appliedDiscounts.map((discount, i) => (
                <div key={i} className="flex justify-between text-sm text-green-600 font-medium">
                  <span>{discount.description}</span>
                  <span>-{formatCurrency(discount.amount)}</span>
                </div>
              ))}
              
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(totalToPay)}</span>
              </div>
            </div>

            {/* Minimum Order Warning */}
            {settings?.minShippingOrderAmount > 0 && rawSubtotal < settings.minShippingOrderAmount && (
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                  <p className="font-medium">Mínimo para envío a domicilio</p>
                  <p>Te faltan <strong>{formatCurrency(settings.minShippingOrderAmount - rawSubtotal)}</strong> para alcanzar el mínimo de {formatCurrency(settings.minShippingOrderAmount)}.</p>
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
                if (isSyncing) {
                  e.preventDefault()
                } else {
                  setIsOpen(false)
                }
              }}
            >
              {isSyncing ? (
                "Actualizando..."
              ) : (
                <Link href="/checkout">
                  Finalizar compra
                </Link>
              )}
            </Button>
            <Button asChild variant="outline" className="hidden w-full md:inline-flex" onClick={() => setIsOpen(false)}>
              <Link href="/cart">
                Ver carrito
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
