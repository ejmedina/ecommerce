"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { createOrder } from "@/lib/actions/order-actions"
import { Check, ChevronRight, Truck, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail } from "lucide-react"
import { 
  ARGENTINE_PROVINCES, 
  ProvinceId,
  ShippingConfig,
  calculateShipping,
  getDefaultShippingConfig 
} from "@/lib/shipping"
import { type PricingResult } from "@/lib/pricing"

interface SavedAddress {
  id: string
  label: string
  street: string
  number: string
  floor?: string | null
  apartment?: string | null
  city: string
  state: string
  postalCode: string
  instructions?: string | null
  isDefault: boolean
}

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
    shippingConfig: any
    paymentMethods?: Record<string, { isActive: boolean; label: string; description: string }> | null
  }
  pricingResult: PricingResult
  user?: { id: string; email?: string | null; name?: string | null } | null
  addresses?: SavedAddress[]
}

type Step = "account" | "shipping" | "address" | "payment" | "confirm"

const STEPS: { id: Step; label: string }[] = [
  { id: "account", label: "Cuenta" },
  { id: "shipping", label: "Envío" },
  { id: "address", label: "Dirección" },
  { id: "payment", label: "Pago" },
  { id: "confirm", label: "Confirmar" },
]

export function CheckoutSteps({ cart, settings, pricingResult, user, addresses = [] }: CheckoutStepsProps) {
  const router = useRouter()
  
  // Si el usuario está logueado, empezar desde "shipping" y marcar "account" como completado
  const initialStep: Step = user ? "shipping" : "account"
  const initialCompleted: Set<Step> = user ? new Set(["account"]) : new Set()
  
  const [currentStep, setCurrentStep] = useState<Step>(initialStep)
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(initialCompleted)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "shipping">("pickup")
  
  const defaultPaymentMethods: Record<string, { isActive: boolean; label: string; description: string }> = {
    ONLINE_CARD: { isActive: true, label: "Mercado Pago", description: "Pago online seguro" },
    BANK_TRANSFER: { isActive: true, label: "Transferencia bancaria", description: "Confirmación manual" },
    CASH_ON_DELIVERY: { isActive: true, label: "Efectivo contra entrega", description: "Al recibir el pedido" }
  }
  const paymentMethodsConfig = settings.paymentMethods || defaultPaymentMethods
  const activeMethods = Object.keys(paymentMethodsConfig).filter(k => paymentMethodsConfig[k].isActive)
  
  const [paymentMethod, setPaymentMethod] = useState<string>(activeMethods[0] || "ONLINE_CARD")
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(addresses.find(a => a.isDefault)?.id || null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState(addresses)
  
  // New: Province selector for shipping calculation
  const [selectedProvince, setSelectedProvince] = useState<ProvinceId | "">("")
  const [shippingCalculation, setShippingCalculation] = useState<{
    cost: number
    isFree: boolean
    freeFrom: number | null
    zoneName: string
  } | null>(null)
  
  // Auth state
  type AuthMode = "login" | "register" | "guest"
  const [authMode, setAuthMode] = useState<AuthMode>("guest")
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "", phone: "" })
  const [guestEmail, setGuestEmail] = useState("")
  const [guestSent, setGuestSent] = useState(false)
  const [registerSent, setRegisterSent] = useState(false)
  
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

  // Get shipping config
  const shippingConfig = settings.shippingConfig || getDefaultShippingConfig()
  
  // Calculate shipping when province or city changes
  useEffect(() => {
    if (shippingMethod === "shipping" && selectedProvince && formData.city) {
      const calc = calculateShipping(
        selectedProvince as ProvinceId,
        formData.city,
        pricingResult.totalToPay, // Use total to pay (after discounts) for free shipping threshold
        shippingConfig
      )
      if (calc) {
        setShippingCalculation({
          cost: calc.cost,
          isFree: calc.isFree,
          freeFrom: calc.freeFrom,
          zoneName: calc.zone.name,
        })
      } else {
        setShippingCalculation(null)
      }
    } else {
      setShippingCalculation(null)
    }
  }, [selectedProvince, formData.city, pricingResult.totalToPay, shippingConfig, shippingMethod])

  const shippingCost = shippingMethod === "shipping" 
    ? (shippingCalculation?.cost ?? 0)
    : 0
  const total = pricingResult.totalToPay + shippingCost

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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const provinceId = e.target.value as ProvinceId
    setSelectedProvince(provinceId)
    
    // Also sync with formData for consistency
    setFormData(prev => ({
      ...prev,
      state: provinceId,
      // If it's CABA, city is also CABA
      city: provinceId === "CABA" ? "CABA" : prev.city
    }))
  }

  function goToStep(step: Step) {
    const currentIndex = visibleSteps.indexOf(currentStep)
    const targetIndex = visibleSteps.indexOf(step)
    
    if (targetIndex <= currentIndex) {
      setCurrentStep(step)
    }
  }

  function nextStep() {
    setCompletedSteps(prev => new Set(prev).add(currentStep))
    
    const currentIndex = visibleSteps.indexOf(currentStep)
    const nextIndex = currentIndex + 1
    
    if (nextIndex < visibleSteps.length) {
      setCurrentStep(visibleSteps[nextIndex])
    }
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "account":
        return true
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
      nextStep()
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
      setRegisterSent(true)
      setGuestSent(false)
      setFormData(prev => ({ ...prev, email: registerData.email, name: registerData.name, phone: registerData.phone }))
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
      setFormData(prev => ({ ...prev, email: guestEmail }))
      nextStep()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Error")
    } finally {
      setIsLoading(false)
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
      formDataObj.set("discountAmount", pricingResult.discountAmount.toString())

      const result = await createOrder(formDataObj)
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
        return
      }

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else if (result.orderId) {
        router.push(`/checkout/success?order=${result.orderId}`)
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar el pedido",
      })
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

      {/* Step Content */}
      <div className="grid lg:grid-cols-2 gap-8 items-stretch">
        {/* Left column - Form */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Account Step */}
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

                  <TabsContent value="login" className="space-y-4 pt-4 flex-1">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login-email">Email</Label>
                        <Input id="login-email" type="email" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} required />
                      </div>
                      <div>
                        <Label htmlFor="login-password">Contraseña</Label>
                        <Input id="login-password" type="password" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} required />
                      </div>
                      {authError && <p className="text-sm text-destructive">{authError}</p>}
                      <Button type="submit" className="w-full" isLoading={isLoading}>
                        Iniciar sesión
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4 pt-4 flex-1">
                    {registerSent ? (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-green-600" />
                        <h3 className="font-medium text-lg mb-2">¡Cuenta creada!</h3>
                        <p className="text-sm text-muted-foreground">
                          Te enviamos un email de verificación a <strong>{registerData.email}</strong>.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                          <Label htmlFor="register-name">Nombre</Label>
                          <Input id="register-name" value={registerData.name} onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="register-phone">Teléfono</Label>
                          <Input id="register-phone" type="tel" value={registerData.phone} onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="register-email">Email</Label>
                          <Input id="register-email" type="email" value={registerData.email} onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))} required />
                        </div>
                        <div>
                          <Label htmlFor="register-password">Contraseña</Label>
                          <Input id="register-password" type="password" value={registerData.password} onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))} required minLength={8} />
                        </div>
                        {authError && <p className="text-sm text-destructive">{authError}</p>}
                        <Button type="submit" className="w-full" isLoading={isLoading}>
                          Crear cuenta
                        </Button>
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="guest" className="space-y-4 pt-4 flex-1">
                    <div className="text-center mb-4">
                      <Mail className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium">Checkout como invitado</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ingresá tu email para continuar.
                      </p>
                    </div>
                    <form onSubmit={handleGuestCheckout} className="space-y-4">
                      <div>
                        <Label htmlFor="guest-email">Email</Label>
                        <Input id="guest-email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="tu@email.com" required />
                      </div>
                      {authError && <p className="text-sm text-destructive">{authError}</p>}
                      <Button type="submit" className="w-full" isLoading={isLoading} disabled={guestSent}>
                        {guestSent ? "¡Listo! Continuar" : "Continuar como invitado"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
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
                    </Label>
                  </div>
                </RadioGroup>

                {/* Shipping Calculator - shown when shipping is selected */}
                {shippingMethod === "shipping" && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-medium text-sm">Calculá el costo de envío</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="province">Seleccioná tu provincia</Label>
                      <select
                        id="province"
                        value={selectedProvince}
                        onChange={handleProvinceChange}
                        className="w-full h-10 px-3 border rounded-md bg-background"
                      >
                        <option value="">Seleccionar provincia...</option>
                        {ARGENTINE_PROVINCES.map(province => (
                          <option key={province.id} value={province.id}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProvince && (
                      <div className="space-y-2">
                        <Label htmlFor="checkout-city">Tu ciudad</Label>
                        <Input 
                          id="checkout-city" 
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Ej: Mar del Plata"
                        />
                      </div>
                    )}

                    {shippingCalculation && selectedProvince && formData.city && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-800">Zona: {shippingCalculation.zoneName}</span>
                        </div>
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-green-800">Costo de envío:</span>
                          <span className="text-green-800">
                            {shippingCalculation.isFree 
                              ? "¡GRATIS!" 
                              : formatCurrency(shippingCalculation.cost)}
                          </span>
                        </div>
                        {shippingCalculation.isFree && shippingCalculation.freeFrom && (
                          <p className="text-xs text-green-700">
                            ¡Con tu compra de {formatCurrency(shippingCalculation.freeFrom)} el envío es gratis!
                          </p>
                        )}
                        {!shippingCalculation.isFree && shippingCalculation.freeFrom && (
                          <p className="text-xs text-muted-foreground">
                            Comprando {formatCurrency(shippingCalculation.freeFrom)} tenés envío gratis
                          </p>
                        )}
                      </div>
                    )}

                    {selectedProvince && formData.city && !shippingCalculation && (
                      <p className="text-sm text-muted-foreground">
                        No tenemos envío configurado para esta zona. Seleccioná otra provincia o completá tu dirección.
                      </p>
                    )}
                  </div>
                )}

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
                {savedAddresses.length > 0 && !showNewAddressForm ? (
                  <>
                    <div className="space-y-2">
                      {savedAddresses.map((address) => (
                        <div 
                          key={address.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedAddressId === address.id 
                              ? "border-primary bg-primary/5" 
                              : "hover:border-muted-foreground"
                          }`}
                          onClick={() => {
                            setSelectedAddressId(address.id)
                            setFormData({
                              ...formData,
                              street: address.street,
                              number: address.number,
                              floor: address.floor || "",
                              apartment: address.apartment || "",
                              city: address.city,
                              state: address.state,
                              postalCode: address.postalCode,
                              instructions: address.instructions || "",
                            })
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{address.label}</span>
                            {address.isDefault && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Principal</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.street} {address.number}, {address.city}, {address.state}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" onClick={() => setShowNewAddressForm(true)} className="w-full">
                      + Agregar nueva dirección
                    </Button>
                  </>
                ) : (
                  <>
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
                        <select
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="">Seleccioná una provincia</option>
                          {ARGENTINE_PROVINCES.map((province) => (
                            <option key={province.id} value={province.id}>
                              {province.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="instructions">Instrucciones de entrega</Label>
                      <Textarea id="instructions" name="instructions" value={formData.instructions} onChange={handleInputChange} placeholder="Ej: timbre en el 3er piso, dejar en conserjería..." />
                    </div>
                    {savedAddresses.length > 0 && (
                      <Button variant="outline" onClick={() => setShowNewAddressForm(false)} className="w-full">
                        ← Volver a mis direcciones
                      </Button>
                    )}
                  </>
                )}
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
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                  {Object.entries(paymentMethodsConfig)
                    .filter(([_, method]) => method.isActive)
                    .map(([key, method]) => (
                    <div key={key} className="flex items-center space-x-2 border rounded-lg p-4 mb-2">
                       <RadioGroupItem value={key} id={`pm-${key}`} />
                       <Label htmlFor={`pm-${key}`} className="flex-1 cursor-pointer">
                         <strong>{method.label}</strong>
                         <span className="text-muted-foreground ml-2">{method.description}</span>
                       </Label>
                    </div>
                  ))}
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
                  <p><strong>Método de pago:</strong> {paymentMethodsConfig[paymentMethod]?.label || paymentMethod}</p>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg border border-primary">
                  <p className="text-center font-medium text-primary">
                    Al tocar "Confirmar pedido" tu pedido será procesado
                  </p>
                </div>

                <div className="mt-auto">
                  <Button onClick={handleSubmit} className="w-full" size="lg" isLoading={isSubmitting}>
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
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(pricingResult.rawSubtotal)}</span>
                </div>
                
                {pricingResult.discounts.map((discount, idx) => (
                  <div key={idx} className="flex justify-between text-green-600 font-medium">
                    <span>{discount.description}</span>
                    <span>-{formatCurrency(discount.amount)}</span>
                  </div>
                ))}

                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>
                    {shippingCost === 0 
                      ? shippingMethod === "pickup" 
                        ? "Gratis" 
                        : (shippingCalculation?.isFree ? "Gratis" : shippingCalculation ? formatCurrency(shippingCost) : "A calcular")
                      : formatCurrency(shippingCost)}
                  </span>
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
