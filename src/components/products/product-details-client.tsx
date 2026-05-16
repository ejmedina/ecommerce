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
  const [selectedComboOptions, setSelectedComboOptions] = useState<Record<string, Record<string, string>>>({})
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)
  const [variantBusyId, setVariantBusyId] = useState<string | null>(null)
  const [variantDraftQuantities, setVariantDraftQuantities] = useState<Record<string, number>>({})

  const processedVariants = useMemo(() => {
    return product.variants.map(v => ({
      ...v,
      options: typeof v.options === "string" ? JSON.parse(v.options) : v.options
    }))
  }, [product.variants])

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

  const currentPrice = Number(product.price)
  const currentComparePrice = product.comparePrice ? Number(product.comparePrice) : null
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
    : product.stock
  const isComboSelectionPending = product.isCombo && comboConfiguration === null
  const isAvailable = product.isCombo
    ? Boolean(comboConfiguration) && (comboStock === null || comboStock > 0)
    : (product.hasPermanentStock || currentStock > 0 || product.hasVariants)
  const displayPrice = product.isCombo ? Number(product.price) : currentPrice

  const { cart, refreshCart, setIsOpen, updateItemQuantityOptimistic } = useCart()
  const cartItem = cart?.items.find((item) => 
    item.productId === product.id
    && (
      product.isCombo
        ? Boolean(comboSelectionSignature) && item.selectionSignature === comboSelectionSignature
        : !item.variantId
    )
  )
  const variantCartItems = useMemo(
    () =>
      new Map(
        (cart?.items || [])
          .filter((item) => item.productId === product.id && Boolean(item.variantId))
          .map((item) => [item.variantId as string, item])
      ),
    [cart?.items, product.id]
  )

  useEffect(() => {
    if (!product.hasVariants || product.isCombo) return

    setVariantDraftQuantities((current) => {
      const next = { ...current }
      for (const variant of processedVariants) {
        if (!next[variant.id]) {
          next[variant.id] = 1
        }
      }
      return next
    })
  }, [processedVariants, product.hasVariants, product.isCombo])

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

  const updateVariantDraftQuantity = (variantId: string, nextQuantity: number) => {
    setVariantDraftQuantities((current) => ({
      ...current,
      [variantId]: nextQuantity,
    }))
  }

  const handleAddVariantToCart = async (variant: ProductVariant) => {
    const draftQuantity = variantDraftQuantities[variant.id] || 1
    setVariantBusyId(variant.id)

    try {
      const formData = new FormData()
      formData.set("productId", product.id)
      formData.set("variantId", variant.id)
      formData.set("quantity", draftQuantity.toString())

      const response = await fetch("/api/cart/add", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Error",
          description: result?.error || "No se pudo agregar la variante al carrito",
        })
        return
      }

      const variantPrice = Number(variant.price ?? product.price)
      const trackedItem = createAnalyticsItem({
        itemId: variant.id,
        itemName: variant.title ? `${product.name} - ${variant.title}` : product.name,
        price: variantPrice,
        quantity: draftQuantity,
        itemCategory: product.categoryName || null,
        itemVariant: variant.title || null,
      })

      trackAddToCart(
        createEcommercePayload([trackedItem], {
          value: variantPrice * draftQuantity,
        })
      )

      await refreshCart()
      setIsOpen(true)
    } catch (error) {
      console.error("Variant cart error:", error)
    } finally {
      setVariantBusyId(null)
    }
  }

  const handleUpdateVariantCartQuantity = async (variantId: string, newQuantity: number) => {
    const variantCartItem = variantCartItems.get(variantId)
    if (!variantCartItem) return

    if (newQuantity <= 0) {
      if (window.confirm("¿Seguro que querés eliminar esta variante del carrito?")) {
        setVariantBusyId(variantId)
        try {
          const response = await fetch(`/api/cart/items/${variantCartItem.id}`, { method: "DELETE" })
          if (!response.ok) {
            throw new Error("No se pudo eliminar la variante del carrito")
          }
          await refreshCart()
        } finally {
          setVariantBusyId(null)
        }
      }
      return
    }

    updateItemQuantityOptimistic(variantCartItem.id, newQuantity)
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
          itemVariant: null,
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
        {product.hasVariants && !product.isCombo ? (
          <span className="text-sm font-medium text-muted-foreground">
            Elegí cantidades por variante.
          </span>
        ) : product.isCombo && isComboSelectionPending ? (
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

      {/* Variant Selection */}
      {product.hasVariants && !product.isCombo && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Variantes</h3>
            <p className="text-sm text-muted-foreground">
              Podés agregar cantidades distintas de cada variante.
            </p>
          </div>

          <div className="space-y-3">
            {processedVariants.map((variant) => {
              const variantCartItem = variantCartItems.get(variant.id)
              const draftQuantity = variantDraftQuantities[variant.id] || 1
              const variantPrice = Number(variant.price ?? product.price)
              const variantInStock = product.hasPermanentStock || variant.stock > 0
              const maxQuantity = product.hasPermanentStock ? undefined : variant.stock

              return (
                <div key={variant.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{variant.title || product.name}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatCurrency(variantPrice)}</span>
                        {variant.sku && <span>SKU: {variant.sku}</span>}
                        {product.hasPermanentStock ? (
                          <span className="text-green-600 font-medium">En stock</span>
                        ) : variant.stock > 0 ? (
                          <span className="text-green-600 font-medium">
                            {variant.stock} disponibles
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">Sin stock</span>
                        )}
                      </div>
                    </div>

                    {variantCartItem ? (
                      <QuantitySelector
                        value={variantCartItem.quantity}
                        onChange={(nextQuantity) => handleUpdateVariantCartQuantity(variant.id, nextQuantity)}
                        min={0}
                        max={maxQuantity}
                        disabled={variantBusyId === variant.id || isUpdating}
                        size="default"
                      />
                    ) : (
                      <div className="flex gap-3">
                        <QuantitySelector
                          value={draftQuantity}
                          onChange={(nextQuantity) => updateVariantDraftQuantity(variant.id, nextQuantity)}
                          min={1}
                          max={maxQuantity}
                          disabled={variantBusyId === variant.id || !variantInStock}
                          size="default"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAddVariantToCart(variant)}
                          disabled={variantBusyId === variant.id || !variantInStock}
                        >
                          {variantBusyId === variant.id ? "Agregando..." : "Agregar"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
      {!product.hasVariants && (isAvailable || isComboSelectionPending) && (
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
                  || isComboSelectionPending
                  || !isAvailable
                }
              >
                {product.isCombo && isComboSelectionPending
                  ? "Completá el combo"
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
