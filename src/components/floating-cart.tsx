"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { useCart } from "@/components/cart-context"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

export function FloatingCart() {
  const { cart, isOpen, setIsOpen, refreshCart } = useCart()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  if (!isOpen) return null

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setIsRemoving(itemId)
    try {
      await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      await refreshCart()
    } finally {
      setIsRemoving(null)
    }
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

  const subtotal = cart?.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  ) || 0

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
                  <div className="w-20 h-20 bg-muted rounded overflow-hidden shrink-0">
                    {item.product.images[0] ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.images[0].alt || item.product.name}
                        className="w-full h-full object-cover"
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
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isRemoving === item.id}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isRemoving === item.id}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-auto text-destructive"
                        onClick={() => removeItem(item.id)}
                        disabled={isRemoving === item.id}
                      >
                        <Trash2 className="h-3 w-3" />
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
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Button asChild className="w-full" size="lg" onClick={() => setIsOpen(false)}>
              <Link href="/cart">
                Ver carrito
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
              <Link href="/checkout">
                Finalizar compra
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
