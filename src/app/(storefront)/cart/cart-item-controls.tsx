"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { removeFromCart, updateCartItem } from "@/lib/actions/cart-actions"
import { useTransition } from "react"

interface Props {
  itemId: string
  quantity: number
}

export function CartItemControls({ itemId, quantity }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleUpdate = (newQty: number) => {
    startTransition(async () => {
      await updateCartItem(itemId, newQty)
    })
  }

  const handleRemove = () => {
    if (window.confirm("¿Seguro que querés eliminar este producto?")) {
      startTransition(async () => {
        await removeFromCart(itemId)
      })
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => handleUpdate(Math.max(1, quantity - 1))}
          disabled={isPending}
        >
          <span>-</span>
        </Button>
        <span className="w-8 text-center">{quantity}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => handleUpdate(quantity + 1)}
          disabled={isPending}
        >
          <span>+</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
