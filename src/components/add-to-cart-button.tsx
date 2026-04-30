"use client"

import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useCart } from "@/components/cart-context"
import { QuantitySelector } from "@/components/ui/quantity-selector"

interface AddToCartButtonProps {
  productId: string
  productName: string
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function AddToCartButton({
  productId,
  productName,
  className = "",
  size = "default",
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [isUpdating, setIsUpdating] = useState(false)
  const { cart, refreshCart } = useCart()
  const { toast } = useToast()

  const cartItem = cart?.items.find((item: any) => item.productId === productId && !item.variantId)

  const handleAddToCart = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("productId", productId)
      formData.append("quantity", "1")
      formData.append("redirect", "false")

      try {
        const res = await fetch("/api/cart/add", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Error al agregar al carrito")
        }

        toast({
          title: "Producto agregado",
          description: `${productName} se agregó al carrito`,
          duration: 3000,
        })

        await refreshCart()
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar al carrito",
          variant: "destructive",
        })
      }
    })
  }

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (!cartItem) return
    
    if (newQuantity <= 0) {
      if (window.confirm(`¿Seguro que querés eliminar ${productName} del carrito?`)) {
        setIsUpdating(true)
        try {
          await fetch(`/api/cart/items/${cartItem.id}`, { method: "DELETE" })
          await refreshCart()
        } finally {
          setIsUpdating(false)
        }
      }
      return
    }

    setIsUpdating(true)
    try {
      await fetch(`/api/cart/items/${cartItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      await refreshCart()
    } finally {
      setIsUpdating(false)
    }
  }

  if (cartItem) {
    return (
      <div className={className}>
        <QuantitySelector
          value={cartItem.quantity}
          onChange={handleUpdateQuantity}
          min={0}
          disabled={isPending || isUpdating}
          size={size === "icon" ? "sm" : size}
          className="w-full justify-center"
        />
      </div>
    )
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isPending}
      size={size}
      className={className}
    >
      {isPending ? "Agregando..." : "Agregar al carrito"}
    </Button>
  )
}
