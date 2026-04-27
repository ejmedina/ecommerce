"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useCart } from "@/components/cart-context"

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
  const { refreshCart } = useCart()
  const { toast } = useToast()

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
