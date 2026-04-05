"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

import { type PricingResult } from "@/lib/pricing"

interface CartItem {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  product: {
    id: string
    name: string
    price: number
    discountType?: string | null
    discountConfig?: any | null
    images: { url: string; alt: string | null }[]
  }
  variant: {
    id: string
    title: string
    price: number | null
    sku: string | null
  } | null
}

interface Cart {
  id: string
  items: CartItem[]
  pricingResult?: PricingResult | null
}

interface CartContextType {
  cart: Cart | null
  itemCount: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  refreshCart: () => Promise<void>
  pricingResult: PricingResult | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const refreshCart = async () => {
    try {
      const res = await fetch("/api/cart")
      if (res.ok) {
        const data = await res.json()
        setCart(data)
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    }
  }

  useEffect(() => {
    refreshCart()
  }, [])

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const pricingResult = cart?.pricingResult || null

  return (
    <CartContext.Provider value={{ cart, itemCount, isOpen, setIsOpen, refreshCart, pricingResult }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
