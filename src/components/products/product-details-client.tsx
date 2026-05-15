"use client"

import { useEffect, useMemo, useState } from "react"
import {
  buildComboSelectionSignature,
  type CartComboConfiguration,
  type CartComboConfigurationItem,
} from "@/lib/combos"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { QuantitySelector } from "@/components/ui/quantity-selector"
import { useCart } from "@/components/cart-context"
import {
  createAnalyticsItem,
  createEcommercePayload,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewItem,
} from "@/lib/analytics"

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
  options: Record<string, string>
  title: string | null
}

interface ProductDetailsClientProps {
  product: {
    id: string
    name: string
    categoryName?: string | null
    price: number
    comparePrice: number | null
    stock: number
    hasPermanentStock: boolean
    hasVariants: boolean
    isCombo: boolean
    options: ProductOption[]
    variants: ProductVariant[]
    comboComponents: {
      id: string
      quantity: number
      product: {
        id: string
        name: string
        sku: string | null
        stock: number
        hasPermanentStock: boolean
        hasVariants: boolean
        options: ProductOption[]
        variants: ProductVariant[]
      }
    }[]
  }
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [selectedComboOptions, setSelectedComboOptions] = useState<Record<string, Record<string, string>>>({})
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)

  const processedVariants = useMemo(() => {
    return product.variants.map(v => ({
      ...v,
      options: typeof v.options === "string" ? JSON.parse(v.options) : v.options
    }))
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.hasVariants) return null
    if (Object.keys(selectedOptions).length !== product.options.length) return null

    return processedVariants.find((variant) => {
      return Object.entries(selectedOptions).every(([name, value]) => variant.options[name] === value)
    })
  }, [selectedOptions, processedVariants, product.hasVariants, product.options])

  const processedComboComponents = useMemo(() => {
    return product.comboComponents.map((component) => ({
      ...component,
      product: {
        ...component.product,
        variants: component.product.variants.map((variant) => ({
          ...variant,
          options: typeof variant.options === "string"
            ? JSON.parse(variant.options)
            : variant.options,
        })),
      },
    }))
  }, [product.comboComponents])

  const comboSelections = useMemo(() => {
    return processedComboComponents.map((component) => {
      const componentProduct = component.product
      const componentOptions = selectedComboOptions[component.id] ?? {}
      const selectedVariantForComponent = componentProduct.hasVariants
        && Object.keys(componentOptions).length === componentProduct.options.length
        ? componentProduct.variants.find((variant) =>
            Object.entries(componentOptions).every(
              ([optionName, optionValue]) => variant.options[optionName] === optionValue
            )
          ) ?? null
        : null

      return {
        ...component,
        selectedOptions: componentOptions,
        selectedVariant: selectedVariantForComponent,
      }
    })
  }, [processedComboComponents, selectedComboOptions])

  const currentPrice = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.price)
  const currentComparePrice = selectedVariant 
    ? (Number(selectedVariant.price) === Number(product.price) ? (product.comparePrice ? Number(product.comparePrice) : null) : null) 
    : (product.comparePrice ? Number(product.comparePrice) : null)
  const comboConfiguration = useMemo<CartComboConfiguration | null>(() => {
    if (!product.isCombo) return null

    const configuration: CartComboConfigurationItem[] = []
    for (const component of comboSelections) {
      if (component.product.hasVariants && !component.selectedVariant) {
        return null
      }

      configuration.push({
        comboComponentId: component.id,
        productId: component.product.id,
        productName: component.product.name,
        variantId: component.selectedVariant?.id ?? null,
        variantTitle: component.selectedVariant?.title ?? null,
        quantityPerCombo: component.quantity,
      })
    }

    return configuration
  }, [comboSelections, product.isCombo])

  const comboSelectionSignature = useMemo(() => {
    if (!comboConfiguration) return null
    return buildComboSelectionSignature(comboConfiguration)
  }, [comboConfiguration])

  const comboStock = useMemo(() => {
    if (!product.isCombo) return null
    if (!comboConfiguration) return null

    let availableStock: number | null = null

    for (const component of comboSelections) {
      if (component.product.hasVariants) {
        const selectedComponentVariant = component.selectedVariant
        if (!selectedComponentVariant) {
          return null
        }

        if (!component.product.hasPermanentStock) {
          const componentAvailability = Math.floor(selectedComponentVariant.stock / component.quantity)
          availableStock = availableStock === null
            ? componentAvailability
            : Math.min(availableStock, componentAvailability)
        }
        continue
      }

      if (!component.product.hasPermanentStock) {
        const componentAvailability = Math.floor(component.product.stock / component.quantity)
        availableStock = availableStock === null
          ? componentAvailability
          : Math.min(availableStock, componentAvailability)
      }
    }

    return availableStock
  }, [comboConfiguration, comboSelections, product.isCombo])

  const currentStock = product.isCombo
    ? comboStock
    : (selectedVariant ? selectedVariant.stock : product.stock)
  const isComboSelectionPending = product.isCombo && comboConfiguration === null
  const isAvailable = product.isCombo
    ? Boolean(comboConfiguration) && (comboStock === null || comboStock > 0)
    : (product.hasPermanentStock || currentStock > 0)
  const displayPrice = product.isCombo ? Number(product.price) : currentPrice

  const { cart, refreshCart, setIsOpen, updateItemQuantityOptimistic } = useCart()
  const cartItem = cart?.items.find((item) => 
    item.productId === product.id
    && (
      product.isCombo
        ? Boolean(comboSelectionSignature) && item.selectionSignature === comboSelectionSignature
        : product.hasVariants
          ? item.variantId === selectedVariant?.id
          : !item.variantId
    )
  )

  useEffect(() => {
    const item = createAnalyticsItem({
      itemId: product.id,
      itemName: product.name,
      price: Number(product.price),
      quantity: 1,
      itemCategory: product.categoryName || null,
    })

    trackViewItem(
      createEcommercePayload([item], {
        value: Number(product.price),
      })
    )
  }, [product.categoryName, product.id, product.name, product.price])

  const updateComboOption = (
    componentId: string,
    optionName: string,
    optionValue: string
  ) => {
    setSelectedComboOptions((current) => ({
      ...current,
      [componentId]: {
        ...(current[componentId] ?? {}),
        [optionName]: optionValue,
      },
    }))
    setQuantity(1)
  }

  const handleUpdateCartQuantity = async (newQuantity: number) => {
    if (!cartItem) return
    
    if (newQuantity <= 0) {
      if (window.confirm(`¿Seguro que querés eliminar este producto del carrito?`)) {
        setIsUpdating(true)
        try {
          const response = await fetch(`/api/cart/items/${cartItem.id}`, { method: "DELETE" })
          if (!response.ok) {
            throw new Error("No se pudo eliminar del carrito")
          }
          trackRemoveFromCart(
            createEcommercePayload([
              createAnalyticsItem({
                itemId: cartItem.variant?.id || product.id,
                itemName: cartItem.variant?.title
                  ? `${product.name} - ${cartItem.variant.title}`
                  : product.name,
                price: cartItem.variant?.price ?? product.price,
                quantity: cartItem.quantity,
                itemCategory: product.categoryName || null,
                itemVariant: cartItem.variant?.title || null,
              }),
            ], {
              value: (cartItem.variant?.price ?? product.price) * cartItem.quantity,
            })
          )
          await refreshCart()
        } finally {
          setIsUpdating(false)
        }
      }
      return
    }

    updateItemQuantityOptimistic(cartItem.id, newQuantity)
  }

  const handleAddToCart = async () => {
    if (product.hasVariants && !selectedVariant) {
      toast({
        variant: "destructive",
        title: "Selección incompleta",
        description: "Por favor elegí todas las opciones disponibles."
      })
      return
    }

    if (product.isCombo && !comboConfiguration) {
      toast({
        variant: "destructive",
        title: "Selección incompleta",
        description: "Elegí las variantes de cada producto del combo antes de agregarlo."
      })
      return
    }

    setAdding(true)
    try {
      const formData = new FormData()
      formData.set("productId", product.id)
      formData.set("quantity", quantity.toString())
      if (selectedVariant) {
        formData.set("variantId", selectedVariant.id)
      }
      if (comboConfiguration) {
        formData.set("comboConfiguration", JSON.stringify(comboConfiguration))
      }

      const response = await fetch("/api/cart/add", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Error",
          description: result?.error || "No se pudo agregar al carrito"
        })
      } else {
        const trackedItem = createAnalyticsItem({
          itemId: product.id,
          itemName: product.name,
          price: displayPrice,
          quantity,
          itemCategory: product.categoryName || null,
          itemVariant: product.isCombo ? null : (selectedVariant?.title || null),
        })
        trackAddToCart(
          createEcommercePayload([trackedItem], {
            value: displayPrice * quantity,
          })
        )
        await refreshCart()
        setIsOpen(true)
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
          {formatCurrency(displayPrice)}
        </span>
        {currentComparePrice !== null && currentComparePrice > displayPrice && (
          <span className="text-lg text-muted-foreground line-through">
            {formatCurrency(currentComparePrice)}
          </span>
        )}
      </div>

      {/* Stock status */}
      <div className="flex items-center gap-2">
        {product.isCombo && isComboSelectionPending ? (
          <span className="text-sm font-medium text-muted-foreground">
            Completá las opciones del combo para ver disponibilidad.
          </span>
        ) : product.isCombo && currentStock === null ? (
          <span className="text-sm text-green-600 font-medium">En stock</span>
        ) : product.hasPermanentStock ? (
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
                  onClick={() => {
                    setSelectedOptions(prev => ({ ...prev, [option.name]: value }))
                    setQuantity(1)
                  }}
                >
                  {value}
                </Button>
              )
            })}
          </div>
        </div>
      ))}

      {product.isCombo && (
        <div className="space-y-5 border-t pt-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Incluye</h3>
            <p className="text-sm text-muted-foreground">
              Elegí las variantes en los productos que lo necesiten.
            </p>
          </div>

          {comboSelections.map((component) => (
            <div key={component.id} className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="font-medium">
                  {component.quantity} x {component.product.name}
                </p>
                {component.product.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {component.product.sku}</p>
                )}
              </div>

              {component.product.hasVariants ? (
                <div className="space-y-4">
                  {component.product.options.map((option) => (
                    <div key={`${component.id}-${option.id}`} className="space-y-2">
                      <Label>{option.name}</Label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => {
                          const isSelected = component.selectedOptions[option.name] === value

                          return (
                            <Button
                              key={`${component.id}-${option.name}-${value}`}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="rounded-full"
                              onClick={() => updateComboOption(component.id, option.name, value)}
                            >
                              {value}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {component.selectedVariant ? (
                    <p className="text-sm text-muted-foreground">
                      Selección: {component.selectedVariant.title || component.product.name}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Faltan opciones por elegir para este producto.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No requiere selección adicional.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add to Cart Form / Cart Quantity Updater */}
      {(isAvailable || isComboSelectionPending) && (
        <div className="space-y-4 border-t pt-4">
          {cartItem ? (
            <QuantitySelector
              value={cartItem.quantity}
              onChange={handleUpdateCartQuantity}
              min={0}
              max={product.isCombo ? (currentStock ?? undefined) : (product.hasPermanentStock ? undefined : currentStock)}
              disabled={isUpdating}
              size="lg"
              className="w-full justify-center"
            />
          ) : (
            <div className="flex gap-4">
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={product.isCombo
                  ? (currentStock ?? undefined)
                  : (product.hasPermanentStock ? 100 : currentStock)}
                disabled={adding || isComboSelectionPending}
                size="lg"
              />
              <Button 
                type="button"
                onClick={handleAddToCart}
                size="lg" 
                className="flex-1 h-12"
                isLoading={adding}
                disabled={
                  adding
                  || (product.hasVariants && !selectedVariant)
                  || isComboSelectionPending
                  || !isAvailable
                }
              >
                {product.isCombo && isComboSelectionPending
                  ? "Completá el combo"
                  : product.hasVariants && !selectedVariant
                    ? "Seleccioná opciones"
                    : "Agregar al carrito"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</p>
}
