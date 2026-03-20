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
import { Check, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail } from "lucide-react"

interface CheckoutStepsProps {
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

type Step = "account" | "shipping" | "address" | "payment" | "confirm"

const STEPS: { id: Step; label: string }[] = [
  { id: "account", label: "Cuenta" },
  { id: "shipping", label: "Envío" },
  { id: "address", label: "Dirección" },
  { id: "payment", label: "Pago" },
  { id: "confirm", label: "Confirmar" },
]

export function CheckoutSteps({ cart, settings, subtotal, user }: CheckoutStepsProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("account")
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "shipping">("pickup")
  const [paymentMethod, setPaymentMethod] = useState<"MERCADOPAGO" | "BANK_TRANSFER" | "CASH_ON_DELIVERY">("MERCADOPAGO")
  
  // Auth state
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" })
  const [guestEmail, setGuestEmail] = useState("")
  const [guestSent, setGuestSent] = useState(false)
  
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
  
  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al iniciar sesión")
      router.refresh()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al registrar")
      router.refresh()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Error al registrar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestEmail) return
    setIsLoading(true)
    setAuthError("")
    try {
      const res = await fetch("/api/auth/guest-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: guestEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      setGuestSent(true)
      // Pre-fill email in form data
      setFormData(prev => ({ ...prev, email: guestEmail }))
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Error")
    } finally {
      setIsLoading(false)
    }
  }

  const freeShippingMin = Number(settings.freeShippingMin)
  const fixedShippingCost = Number(settings.fixedShippingCost)
  const shippingCost = shippingMethod === "shipping" 
    ? (subtotal >= freeShippingMin ? 0 : fixedShippingCost)
    : 0
  const total = subtotal + shippingCost

  // Determine visible steps based on settings
  const visibleSteps = getVisibleSteps(shippingMethod)

  function getVisibleSteps(currentShipping: "pickup" | "shipping"): Step[] {
    const steps: Step[] = ["account", "shipping"]
    
    if (currentShipping === "shipping") {
      steps.push("address")
    }
    
    steps.push("payment", "confirm")
    return steps
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function goToStep(step: Step) {
    // Only allow going to next step or current step
    const currentIndex = visibleSteps.indexOf(currentStep)
    const targetIndex = visibleSteps.indexOf(step)
    
    if (targetIndex <= currentIndex) {
      setCurrentStep(step)
    }
  }

  function nextStep() {
    // Mark current as completed
    setCompletedSteps(prev => new Set(prev).add(currentStep))
    
    // Find next step
    const currentIndex = visibleSteps.indexOf(currentStep)
    const nextIndex = currentIndex + 1
    
    if (nextIndex < visibleSteps.length) {
      setCurrentStep(visibleSteps[nextIndex])
    }
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "account":
        return true // Auth is handled separately
      case "shipping":
        return true
      case "address":
        return !!(formData.street && formData.number && formData.city && formData.state && formData.postalCode)
      case "payment":
        return true
      case "confirm":
        return true
      default:
        return false
    }
  }

  async function handleSubmit() {
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

  const currentIndex = visibleSteps.indexOf(currentStep)

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const isActive = step === currentStep
          const isCompleted = completedSteps.has(step) || index < currentIndex
          
          return (
            <div key={step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => goToStep(step)}
                disabled={index > currentIndex}
                className={`flex items-center gap-2 ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"} ${index > currentIndex ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive ? "bg-primary text-primary-foreground" : 
                  isCompleted ? "bg-green-600 text-white" : 
                  "bg-muted"
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{STEPS.find(s => s.id === step)?.label}</span>
              </button>
              {index < visibleSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-600" : "bg-muted"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content - using grid with matching heights */}
      <div className="grid lg:grid-cols-2 gap-8 items-stretch">
        {/* Left column - Form */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Account Step - Integrated Auth */}
          {currentStep === "account" && (
            <Card className="h-full flex flex-col">
              <CardHeader className="text-center">
                <CardTitle>¿Ya tenés cuenta?</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <Tabs defaultValue="guest" className="w-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                    <TabsTrigger value="register">Crear cuenta</TabsTrigger>
                    <TabsTrigger value="guest">Invitado</TabsTrigger>
                  </TabsList>

                  {/* Login Tab */}
                  <TabsContent value="login" className="space-y-4 pt-4 flex-1">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="login-password">Contraseña</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                          required
                        />
                      </div>
                      {authError && <p className="text-sm text-destructive">{authError}</p>}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Iniciar sesión
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Register Tab */}
                  <TabsContent value="register" className="space-y-4 pt-4 flex-1">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <Label htmlFor="register-name">Nombre</Label>
                        <Input
                          id="register-name"
                          value={registerData.name}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-password">Contraseña</Label>
                        <Input
                          id="register-password"
                          type="password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                          required
                          minLength={8}
                        />
                      </div>
                      {authError && <p className="text-sm text-destructive">{authError}</p>}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Crear cuenta
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Guest Tab */}
                  <TabsContent value="guest" className="space-y-4 pt-4 flex-1">
                    <div className="text-center mb-4">
                      <Mail className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium">Checkout como invitado</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ingresá tu email para continuar. Te enviaremos un link para crear tu contraseña después de completar el pedido.
                      </p>
                    </div>
                    <form onSubmit={handleGuestCheckout} className="space-y-4">
                      <div>
                        <Label htmlFor="guest-email">Email</Label>
                        <Input
                          id="guest-email"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                      {authError && <p className="text-sm text-destructive">{authError}</p>}
                      <Button type="submit" className="w-full" disabled={isLoading || guestSent}>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {guestSent ? "¡Listo! Continuar" : "Continuar como invitado"}
                      </Button>
                      {guestSent && (
                        <p className="text-sm text-center text-green-600">
                          ¡Revisá tu email! Te enviamos un link para crear tu contraseña.
                        </p>
                      )}
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Continue button after selecting option */}
                <div className="mt-6 pt-4 border-t">
                  <Button onClick={nextStep} className="w-full">
                    Continuar <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipping Method Step */}
          {currentStep === "shipping" && (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Método de envío</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
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
                <div className="mt-auto">
                  <Button onClick={nextStep} className="w-full" disabled={!canProceed()}>
                    Continuar <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address Step */}
          {currentStep === "address" && shippingMethod === "shipping" && (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Dirección de entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
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
                <div className="mt-auto">
                  <Button onClick={nextStep} className="w-full" disabled={!canProceed()}>
                    Continuar <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method Step */}
          {currentStep === "payment" && (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Método de pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
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
                <div className="mt-auto">
                  <Button onClick={nextStep} className="w-full" disabled={!canProceed()}>
                    Continuar <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirm Step */}
          {currentStep === "confirm" && (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Confirmar pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p><strong>Método de envío:</strong> {shippingMethod === "pickup" ? "Retiro en tienda" : "Envío a domicilio"}</p>
                  {shippingMethod === "shipping" && (
                    <p><strong>Dirección:</strong> {formData.street} {formData.number}, {formData.city}, {formData.state}</p>
                  )}
                  <p><strong>Pago:</strong> {paymentMethod === "MERCADOPAGO" ? "Mercado Pago" : paymentMethod === "BANK_TRANSFER" ? "Transferencia bancaria" : "Efectivo"}</p>
                </div>
                
                {/* Contact info input on final step */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Datos de contacto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg border border-primary">
                  <p className="text-center font-medium text-primary">
                    Al tocar "Confirmar pedido" tu pedido será procesado
                  </p>
                </div>

                <div className="mt-auto">
                  <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Procesando..." : `Confirmar pedido - ${formatCurrency(total)}`}
                  </Button>
                </div>
                
                <p className="text-xs text-center text-muted-foreground">
                  Al confirmar, aceptás los términos y condiciones
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Order Summary */}
        <div className="flex flex-col h-full">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Tu pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
