"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { createOrder } from "@/lib/actions/order-actions"

interface CheckoutFormProps {
  cart: {
    id: string
    items: {
      id: string
      quantity: number
      product: {
        id: string
        name: string
        price: unknown
        images: { url: string }[]
        stock: number
      }
    }[]
  }
  settings: {
    freeShippingMin: unknown
    fixedShippingCost: unknown
    bankAccount: unknown
  }
  subtotal: number
  user?: { id: string; email?: string | null; name?: string | null } | null
}

export default function CheckoutForm({ cart, settings, subtotal, user }: CheckoutFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "shipping">("pickup")
  const [paymentMethod, setPaymentMethod] = useState<"MERCADOPAGO" | "BANK_TRANSFER" | "CASH_ON_DELIVERY">("MERCADOPAGO")
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    street: "",
    number: "",
    floor: "",
    apartment: "",
    city: "",
    state: "",
    postalCode: "",
    instructions: "",
  })

  const freeShippingMin = Number(settings.freeShippingMin)
  const fixedShippingCost = Number(settings.fixedShippingCost)
  const shippingCost = shippingMethod === "shipping" 
    ? (subtotal >= freeShippingMin ? 0 : fixedShippingCost)
    : 0
  const total = subtotal + shippingCost

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()
      formDataObj.set("cartId", cart.id)
      formDataObj.set("shippingMethod", shippingMethod)
      formDataObj.set("paymentMethod", paymentMethod)
      formDataObj.set("name", formData.name)
      formDataObj.set("email", formData.email)
      formDataObj.set("phone", formData.phone)
      formDataObj.set("street", formData.street)
      formDataObj.set("number", formData.number)
      formDataObj.set("floor", formData.floor)
      formDataObj.set("apartment", formData.apartment)
      formDataObj.set("city", formData.city)
      formDataObj.set("state", formData.state)
      formDataObj.set("postalCode", formData.postalCode)
      formDataObj.set("instructions", formData.instructions)

      const result = await createOrder(formDataObj)
      
      if (result.error) {
        alert(result.error)
        return
      }

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else if (result.orderId) {
        router.push(`/checkout/success?order=${result.orderId}`)
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Error al procesar el pedido")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="space-y-6">
        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Method */}
        <Card>
          <CardHeader>
            <CardTitle>Método de envío</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as "pickup" | "shipping")}>
              <div className="flex items-center space-x-2 border rounded-lg p-4 mb-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                  <strong>Retiro en tienda</strong>
                  <span className="text-muted-foreground ml-2">Gratis</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4">
                <RadioGroupItem value="shipping" id="shipping" />
                <Label htmlFor="shipping" className="flex-1 cursor-pointer">
                  <strong>Envío a domicilio</strong>
                  <span className="text-muted-foreground ml-2">
                    {freeShippingMin > 0 
                      ? `Gratis desde ${formatCurrency(freeShippingMin)}` 
                      : formatCurrency(fixedShippingCost)}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Address (if shipping) */}
        {shippingMethod === "shipping" && (
          <Card>
            <CardHeader>
              <CardTitle>Dirección de entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-9">
                  <Label htmlFor="street">Calle *</Label>
                  <Input id="street" name="street" value={formData.street} onChange={handleInputChange} required />
                </div>
                <div className="col-span-3">
                  <Label htmlFor="number">Número *</Label>
                  <Input id="number" name="number" value={formData.number} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floor">Piso</Label>
                  <Input id="floor" name="floor" value={formData.floor} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="apartment">Depto</Label>
                  <Input id="apartment" name="apartment" value={formData.apartment} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="postalCode">CP *</Label>
                  <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input id="city" name="city" value={formData.city} onChange={handleInputChange} required />
                </div>
                <div>
                  <Label htmlFor="state">Provincia *</Label>
                  <Input id="state" name="state" value={formData.state} onChange={handleInputChange} required />
                </div>
              </div>
              <div>
                <Label htmlFor="instructions">Instrucciones de entrega</Label>
                <Textarea id="instructions" name="instructions" value={formData.instructions} onChange={handleInputChange} placeholder="Ej: timbre en el 3er piso, dejar en conserjería..." />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
              <div className="flex items-center space-x-2 border rounded-lg p-4 mb-2">
                <RadioGroupItem value="MERCADOPAGO" id="mp" />
                <Label htmlFor="mp" className="flex-1 cursor-pointer">
                  <strong>Mercado Pago</strong>
                  <span className="text-muted-foreground ml-2">Pago online seguro</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 mb-2">
                <RadioGroupItem value="BANK_TRANSFER" id="transfer" />
                <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                  <strong>Transferencia bancaria</strong>
                  <span className="text-muted-foreground ml-2">Confirmación manual</span>
                </Label>
              </div>
              {shippingMethod === "pickup" && (
                <div className="flex items-center space-x-2 border rounded-lg p-4">
                  <RadioGroupItem value="CASH_ON_DELIVERY" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer">
                    <strong>Efectivo</strong>
                    <span className="text-muted-foreground ml-2">Al retirar</span>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Tu pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0">
                    {item.product.images[0] ? (
                      <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sin imagen</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                    <p className="text-sm font-semibold">{formatCurrency(Number(item.product.price) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{shippingCost === 0 ? "Gratis" : formatCurrency(shippingCost)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : `Confirmar pedido - ${formatCurrency(total)}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Al confirmar, aceptás los términos y condiciones
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
