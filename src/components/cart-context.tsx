"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface CartItem {
  id: string
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    images: { url: string; alt: string | null }[]
  }
}

interface Cart {
  id: string
  items: CartItem[]
}

interface CartContextType {
  cart: Cart | null
  itemCount: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  refreshCart: () => Promise<void>
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

  return (
    <CartContext.Provider value={{ cart, itemCount, isOpen, setIsOpen, refreshCart }}>
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
