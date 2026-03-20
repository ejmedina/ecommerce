"use client"

import { ShoppingCart } from "lucide-react"
import { useCart } from "@/components/cart-context"

export function CartButton() {
  const { itemCount, setIsOpen } = useCart()

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative p-2 hover:bg-muted rounded-md transition-colors"
      aria-label={`Carrito con ${itemCount} productos`}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  )
}
