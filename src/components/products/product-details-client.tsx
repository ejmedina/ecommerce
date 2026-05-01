"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { addToCart } from "@/lib/actions/cart-actions"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { QuantitySelector } from "@/components/ui/quantity-selector"
import { useCart } from "@/components/cart-context"

interface ProductOption {
  id: string
  name: string
  values: string[]
}

interface ProductVariant {
  id: string
  sku: string | null
  price: number | null
  stock: number
  options: any
  title: string | null
}

interface ProductDetailsClientProps {
  product: {
    id: string
    name: string
    price: number
    comparePrice: number | null
    stock: number
    hasPermanentStock: boolean
    hasVariants: boolean
    options: ProductOption[]
    variants: ProductVariant[]
  }
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)

  // Deserializar opciones de variantes si vienen como string
  const processedVariants = useMemo(() => {
    return product.variants.map(v => ({
      ...v,
      options: typeof v.options === 'string' ? JSON.parse(v.options) : v.options
    }))
  }, [product.variants])

  // Encontrar variante seleccionada
  const selectedVariant = useMemo(() => {
    if (!product.hasVariants) return null
    if (Object.keys(selectedOptions).length !== product.options.length) return null
    
    return processedVariants.find(v => {
      return Object.entries(selectedOptions).every(([name, value]) => v.options[name] === value)
    })
  }, [selectedOptions, processedVariants, product.hasVariants, product.options])

  const currentPrice = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.price)
  const currentComparePrice = selectedVariant 
    ? (Number(selectedVariant.price) === Number(product.price) ? (product.comparePrice ? Number(product.comparePrice) : null) : null) 
    : (product.comparePrice ? Number(product.comparePrice) : null)
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock
  const isAvailable = product.hasPermanentStock || currentStock > 0

  const [quantity, setQuantity] = useState(1)

  // Reset quantity when variant changes
  useMemo(() => {
    setQuantity(1)
  }, [selectedVariant])

  const { cart, refreshCart, updateItemQuantityOptimistic, isSyncing } = useCart()
  const cartItem = cart?.items.find((item: any) => 
    item.productId === product.id && 
    (product.hasVariants ? item.variantId === selectedVariant?.id : !item.variantId)
  )

  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateCartQuantity = async (newQuantity: number) => {
    if (!cartItem) return
    
    if (newQuantity <= 0) {
      if (window.confirm(`¿Seguro que querés eliminar este producto del carrito?`)) {
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

    updateItemQuantityOptimistic(cartItem.id, newQuantity)
  }

  const handleAddToCart = async (formData: FormData) => {
    if (product.hasVariants && !selectedVariant) {
      toast({
        variant: "destructive",
        title: "Selección incompleta",
        description: "Por favor elegí todas las opciones disponibles."
      })
      return
    }

    setAdding(true)
    try {
      // Ensure the quantity from the state is used
      formData.set("quantity", quantity.toString())
      const result = await addToCart(formData)
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error
        })
      } else {
        await refreshCart()
      }
    } catch (error) {
      console.error("Cart error:", error)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold">
          {formatCurrency(currentPrice)}
        </span>
        {currentComparePrice !== null && currentComparePrice > currentPrice && (
          <span className="text-lg text-muted-foreground line-through">
            {formatCurrency(currentComparePrice)}
          </span>
        )}
      </div>

      {/* Stock status */}
      <div className="flex items-center gap-2">
        {product.hasPermanentStock ? (
          <span className="text-sm text-green-600 font-medium">En stock</span>
        ) : currentStock > 0 ? (
          <span className="text-sm text-green-600 font-medium">
            En stock ({currentStock} disponibles)
          </span>
        ) : (
          <span className="text-sm text-red-600 font-medium">Sin stock</span>
        )}
      </div>

      {/* Options Selection */}
      {product.hasVariants && product.options.map((option) => (
        <div key={option.id} className="space-y-3">
          <Label className="text-base font-semibold">{option.name}</Label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selectedOptions[option.name] === value
              return (
                <Button
                  key={value}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value }))}
                >
                  {value}
                </Button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add to Cart Form / Cart Quantity Updater */}
      {isAvailable && (
        <div className="space-y-4 pt-4 border-t">
          {cartItem ? (
            <QuantitySelector
              value={cartItem.quantity}
              onChange={handleUpdateCartQuantity}
              min={0}
              max={product.hasPermanentStock ? undefined : currentStock}
              size="lg"
              className="w-full justify-center"
            />
          ) : (
            <form action={handleAddToCart} className="flex gap-4">
              <input type="hidden" name="productId" value={product.id} />
              {selectedVariant && (
                <input type="hidden" name="variantId" value={selectedVariant.id} />
              )}
              
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={product.hasPermanentStock ? 100 : currentStock}
                disabled={adding}
                size="lg"
              />
              <Button 
                type="submit" 
                size="lg" 
                className="flex-1 h-12"
                isLoading={adding}
                disabled={adding || (product.hasVariants && !selectedVariant)}
              >
                {product.hasVariants && !selectedVariant ? "Seleccioná opciones" : "Agregar al carrito"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</p>
}
