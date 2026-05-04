"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  createAnalyticsItem,
  createEcommercePayload,
  trackAddToCart,
  trackRemoveFromCart,
} from "@/lib/analytics"

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
      discountConfig?: unknown | null
      category?: { name: string } | null
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

interface PendingUpdate {
  previousQuantity: number
  requestedQuantity: number
}

interface CartContextType {
  cart: Cart | null
  itemCount: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  refreshCart: () => Promise<void>
  updateItemQuantityOptimistic: (itemId: string, newQuantity: number) => void
  isSyncing: boolean
  pricingResult: PricingResult | null
  settings: Record<string, unknown> | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingUpdate>>({})
  const { toast } = useToast()

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const requestIds = useRef<Record<string, number>>({})

  const refreshCart = async () => {
    try {
      const [cartRes, settingsRes] = await Promise.all([
        fetch(`/api/cart?t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" })
      ])
      
      if (cartRes.ok) {
        const data = await cartRes.json()
        setCart(data)
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Error fetching cart/settings:", error)
    }
  }

  useEffect(() => {
    refreshCart()
  }, [])

  const updateItemQuantityOptimistic = (itemId: string, newQuantity: number) => {
    if (!cart) return
    const currentItem = cart.items.find((item) => item.id === itemId)
    if (!currentItem) return
    const previousQuantity = currentItem.quantity

    // Initialize pending update if not exists
    setPendingUpdates((prev) => {
      const existing = prev[itemId]
      const originalQuantity = existing ? existing.previousQuantity : previousQuantity
      
      return {
        ...prev,
        [itemId]: { previousQuantity: originalQuantity, requestedQuantity: newQuantity }
      }
    })

    // Increment request ID
    const newReqId = (requestIds.current[itemId] || 0) + 1
    requestIds.current[itemId] = newReqId

    // Apply optimistic update locally
    setCart((prevCart) => {
      if (!prevCart) return prevCart
      const newItems = prevCart.items.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: newQuantity }
        }
        return item
      })
      
      // Provisory pricing update (very basic)
      const rawSubtotal = newItems.reduce((sum, item) => {
        const price = item.variant?.price ?? item.product.price
        return sum + price * item.quantity
      }, 0)

      return {
        ...prevCart,
        items: newItems,
        pricingResult: prevCart.pricingResult ? {
          ...prevCart.pricingResult,
          rawSubtotal,
          // totalToPay will be inaccurate until the real server response comes back,
          // but we leave it as is or update it roughly if we want.
        } : null
      } as Cart
    })

    // Clear previous timer
    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId])
    }

    // Set new debounce timer
    debounceTimers.current[itemId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQuantity }),
        })

        // Check for out-of-order responses
        if (requestIds.current[itemId] !== newReqId) {
          return // A newer request has been made, ignore this one
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || "Error al actualizar la cantidad")
        }

        const data = await res.json()
        
        // Success: Replace with official cart and remove from pending
        setCart(data.cart)

        const quantityDelta = newQuantity - previousQuantity
        if (quantityDelta !== 0) {
          const analyticsItem = createAnalyticsItem({
            itemId: currentItem.variant?.id || currentItem.product.id,
            itemName: currentItem.variant?.title
              ? `${currentItem.product.name} - ${currentItem.variant.title}`
              : currentItem.product.name,
            price: currentItem.variant?.price ?? currentItem.product.price,
            quantity: Math.abs(quantityDelta),
            itemCategory: currentItem.product.category?.name || null,
            itemVariant: currentItem.variant?.title || null,
          })

          const payload = createEcommercePayload([analyticsItem], {
            value: (currentItem.variant?.price ?? currentItem.product.price) * Math.abs(quantityDelta),
          })

          if (quantityDelta > 0) {
            trackAddToCart(payload)
          } else {
            trackRemoveFromCart(payload)
          }
        }

        setPendingUpdates((prev) => {
          const newPending = { ...prev }
          delete newPending[itemId]
          return newPending
        })

      } catch (error) {
        // Rollback on failure
        if (requestIds.current[itemId] === newReqId) {
          toast({
            title: "Error de stock o validación",
            description: error instanceof Error ? error.message : "No se pudo actualizar la cantidad.",
            variant: "destructive",
          })
          
          await refreshCart() // Recover official state
          
          setPendingUpdates((prev) => {
            const newPending = { ...prev }
            delete newPending[itemId]
            return newPending
          })
        }
      }
    }, 400)
  }

  const isSyncing = Object.keys(pendingUpdates).length > 0
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const pricingResult = cart?.pricingResult || null

  return (
    <CartContext.Provider value={{ 
      cart, 
      itemCount, 
      isOpen, 
      setIsOpen, 
      refreshCart, 
      updateItemQuantityOptimistic,
      isSyncing,
      pricingResult, 
      settings 
    }}>
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
