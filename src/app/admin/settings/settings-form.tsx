"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Upload, Trash2, Save, Loader2, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShippingZone, ShippingConfig, getDefaultShippingConfig } from "@/lib/shipping"
import { ColorPicker, ThemePreview } from "@/components/admin/color-picker"
import { ThemeColors, defaultColors } from "@/components/theme-provider"

interface StoreSettings {
  id: string
  storeName: string
  storeEmail: string | null
  storePhone: string | null
  storeAddress: any
  logo: string | null
  logoWidth: number | null
  logoHeight: number | null
  favicon: string | null
  faviconWidth: number | null
  faviconHeight: number | null
  shippingConfig: ShippingConfig | null
  freeShippingMin: any
  fixedShippingCost: any
  bankAccount: any
  autoConfirmOrders: boolean
  requiresPaymentToFulfill: boolean
  whatsappPreArrivalMessage: string | null
  themeColors: ThemeColors | null
  paymentMethods: Record<string, { isActive: boolean, label: string, description: string }> | null
  minShippingOrderAmount: any
  storePickupEnabled: boolean
}

export function SettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)

  // Form state
  const [storeName, setStoreName] = useState("")
  const [storeEmail, setStoreEmail] = useState("")
  const [storePhone, setStorePhone] = useState("")
  const [storeUrl, setStoreUrl] = useState("")
  const [logo, setLogo] = useState<string | null>(null)
  const [favicon, setFavicon] = useState<string | null>(null)
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({ zones: [] })
  const [autoConfirmOrders, setAutoConfirmOrders] = useState(true)
  const [requiresPaymentToFulfill, setRequiresPaymentToFulfill] = useState(false)
  const [minShippingOrderAmount, setMinShippingOrderAmount] = useState(0)
  const [whatsappPreArrivalMessage, setWhatsappPreArrivalMessage] = useState("")
  const [storePickupEnabled, setStorePickupEnabled] = useState(true)

  // Theme colors state
  const [themeColors, setThemeColors] = useState<ThemeColors>(defaultColors)

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<Record<string, { isActive: boolean, label: string, description: string }>>({
    ONLINE_CARD: { isActive: true, label: "Mercado Pago", description: "Pago online seguro" },
    BANK_TRANSFER: { isActive: true, label: "Transferencia bancaria", description: "Confirmación manual" },
    CASH_ON_DELIVERY: { isActive: true, label: "Efectivo contra entrega", description: "Al recibir el pedido" },
    TRANSFER_ON_DELIVERY: { isActive: false, label: "Transferencia contra entrega", description: "Transferís al momento de recibir" },
    CARD_ON_DELIVERY: { isActive: false, label: "Tarjeta contra entrega", description: "Llevamos posnet para crédito/débito" }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      setSettings(data)
      
      setStoreName(data.storeName || "")
      setStoreEmail(data.storeEmail || "")
      setStorePhone(data.storePhone || "")
      setStoreUrl(data.storeUrl || "")
      setLogo(data.logo)
      setFavicon(data.favicon)
      setAutoConfirmOrders(data.autoConfirmOrders ?? true)
      setRequiresPaymentToFulfill(data.requiresPaymentToFulfill ?? false)
      setMinShippingOrderAmount(Number(data.minShippingOrderAmount) || 0)
      setWhatsappPreArrivalMessage(data.whatsappPreArrivalMessage || "")
      setStorePickupEnabled(data.storePickupEnabled ?? true)
      
      if (data.shippingConfig) {
        setShippingConfig(data.shippingConfig)
      } else {
        setShippingConfig(getDefaultShippingConfig())
      }
      
      if (data.logo) setLogoPreview(data.logo)
      if (data.favicon) setFaviconPreview(data.favicon)

      // Load theme colors
      if (data.themeColors) {
        setThemeColors(data.themeColors)
      }

      // Load payment methods
      if (data.paymentMethods) {
        setPaymentMethods(data.paymentMethods)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings?.id,
          storeName,
          storeEmail: storeEmail || null,
          storePhone: storePhone || null,
          logo,
          favicon,
          shippingConfig,
          autoConfirmOrders,
          requiresPaymentToFulfill,
          minShippingOrderAmount,
          whatsappPreArrivalMessage: whatsappPreArrivalMessage || null,
          storePickupEnabled,
          themeColors,
          paymentMethods,
          storeUrl: storeUrl || null,
        }),
      })

      if (res.ok) {
        toast({
          variant: "success",
          title: "Éxito",
          description: "Configuración guardada",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al guardar",
        })
      }
    } catch (error) {
      console.error("Error saving:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al guardar",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)

    try {
      const res = await fetch("/api/admin/settings/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      
      if (data.url) {
        if (type === "logo") {
          setLogo(data.url)
          setLogoPreview(data.url)
        } else {
          setFavicon(data.url)
          setFaviconPreview(data.url)
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir imagen",
      })
    }
  }

  const addZone = () => {
    const newZone: ShippingZone = {
      id: `zone-${Date.now()}`,
      name: "Nueva zona",
      provinces: [],
      cost: 5000,
      freeFrom: null,
      isActive: true,
    }
    setShippingConfig({
      zones: [...shippingConfig.zones, newZone],
    })
  }

  const updateZone = (index: number, updates: Partial<ShippingZone>) => {
    const newZones = [...shippingConfig.zones]
    newZones[index] = { ...newZones[index], ...updates }
    setShippingConfig({ zones: newZones })
  }

  const removeZone = (index: number) => {
    const newZones = shippingConfig.zones.filter((_, i) => i !== index)
    setShippingConfig({ zones: newZones })
  }

  const toggleProvince = (zoneIndex: number, provinceId: string) => {
    const zone = shippingConfig.zones[zoneIndex]
    const provinces = zone.provinces.includes(provinceId)
      ? zone.provinces.filter(p => p !== provinceId)
      : [...zone.provinces, provinceId]
    updateZone(zoneIndex, { provinces })
  }

  const togglePaymentMethod = (key: string, checked: boolean) => {
    setPaymentMethods(prev => ({
      ...prev,
      [key]: { ...prev[key], isActive: checked }
    }))
  }

  const updateThemeColor = (key: keyof ThemeColors, value: string) => {
    setThemeColors(prev => ({ ...prev, [key]: value }))
  }

  const resetThemeColors = () => {
    setThemeColors(defaultColors)
    toast({
      variant: "success",
      title: "Colores reseteados",
      description: "Los colores han vuelto a los valores por defecto",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración de la Tienda</h1>
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="colors">Colores</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="media">Logos</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la tienda</CardTitle>
              <CardDescription>Detalles generales de tu tienda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="storeName">Nombre de la tienda</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Mi Tienda"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storeEmail">Email</Label>
                <Input
                  id="storeEmail"
                  type="email"
                  value={storeEmail}
                  onChange={(e) => setStoreEmail(e.target.value)}
                  placeholder="tienda@ejemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storePhone">Teléfono</Label>
                <Input
                  id="storePhone"
                  type="tel"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="+54 11 1234 5678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storeUrl">URL de la tienda</Label>
                <Input
                  id="storeUrl"
                  type="url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://mi-tienda.com"
                />
                <p className="text-xs text-muted-foreground">
                  Dominio de tu tienda. Se usa para generar enlaces en emails.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Mensaje de WhatsApp</CardTitle>
              <CardDescription>
                Personaliza el mensaje que se envía cuando un pedido está por llegar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsappMessage">Mensaje pre-venta</Label>
                <Textarea
                  id="whatsappMessage"
                  value={whatsappPreArrivalMessage}
                  onChange={(e) => setWhatsappPreArrivalMessage(e.target.value)}
                  placeholder="Hola, nos comunicamos desde [Nombre de la tienda] para avisarte que tu pedido está por llegar. Llegamos en menos de 10 minutos."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Usa [NOMBRE_TIENDA] para insertar automáticamente el nombre de tu tienda.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Colores del Sitio
                  </CardTitle>
                  <CardDescription>
                    Personaliza los colores de tu tienda. Los cambios se aplican instantáneamente.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={resetThemeColors}>
                  Resetear valores
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Color Pickers */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Colores Principales</h3>
                    <div className="grid gap-4">
                      <ColorPicker
                        label="Primario"
                        value={themeColors.primary}
                        onChange={(c) => updateThemeColor("primary", c)}
                        description="Color principal de botones y elementos destacados"
                      />
                      <ColorPicker
                        label="Texto sobre primario"
                        value={themeColors.primaryForeground}
                        onChange={(c) => updateThemeColor("primaryForeground", c)}
                        description="Color del texto sobre fondos primarios"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-4">Colores Secundarios</h3>
                    <div className="grid gap-4">
                      <ColorPicker
                        label="Secundario"
                        value={themeColors.secondary}
                        onChange={(c) => updateThemeColor("secondary", c)}
                        description="Color para elementos secundarios"
                      />
                      <ColorPicker
                        label="Texto sobre secundario"
                        value={themeColors.secondaryForeground}
                        onChange={(c) => updateThemeColor("secondaryForeground", c)}
                        description="Color del texto sobre fondos secundarios"
                      />
                      <ColorPicker
                        label="Acento"
                        value={themeColors.accent}
                        onChange={(c) => updateThemeColor("accent", c)}
                        description="Color para destacados y énfasis"
                      />
                      <ColorPicker
                        label="Texto sobre acento"
                        value={themeColors.accentForeground}
                        onChange={(c) => updateThemeColor("accentForeground", c)}
                        description="Color del texto sobre fondos de acento"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-4">Colores Base</h3>
                    <div className="grid gap-4">
                      <ColorPicker
                        label="Fondo"
                        value={themeColors.background}
                        onChange={(c) => updateThemeColor("background", c)}
                        description="Color de fondo del sitio"
                      />
                      <ColorPicker
                        label="Texto principal"
                        value={themeColors.foreground}
                        onChange={(c) => updateThemeColor("foreground", c)}
                        description="Color del texto principal"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-4">Colores de UI</h3>
                    <div className="grid gap-4">
                      <ColorPicker
                        label="Bordes"
                        value={themeColors.border}
                        onChange={(c) => updateThemeColor("border", c)}
                        description="Color de bordes y separadores"
                      />
                      <ColorPicker
                        label="Muted"
                        value={themeColors.muted}
                        onChange={(c) => updateThemeColor("muted", c)}
                        description="Color de fondo para elementos apagados"
                      />
                      <ColorPicker
                        label="Texto muted"
                        value={themeColors.mutedForeground}
                        onChange={(c) => updateThemeColor("mutedForeground", c)}
                        description="Color de texto secundario"
                      />
                      <ColorPicker
                        label="Error/Destructivo"
                        value={themeColors.destructive}
                        onChange={(c) => updateThemeColor("destructive", c)}
                        description="Color para errores y acciones peligrosas"
                      />
                      <ColorPicker
                        label="Texto sobre error"
                        value={themeColors.destructiveForeground}
                        onChange={(c) => updateThemeColor("destructiveForeground", c)}
                        description="Color del texto sobre fondos de error"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Vista Previa en Tiempo Real</h3>
                  <ThemePreview colors={themeColors} />
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Esta es una representación aproximada. Verifica el resultado en tu sitio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 mt-6">
          {/* Order Flow Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Pedidos</CardTitle>
              <CardDescription>Configura cómo se procesan los nuevos pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="autoConfirmOrders"
                  checked={autoConfirmOrders}
                  onCheckedChange={(checked) => setAutoConfirmOrders(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="autoConfirmOrders" className="font-medium cursor-pointer">
                    Confirmación automática de pedidos
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Los pedidos nuevos pasan directamente a "Confirmado" sin necesidad de revisión manual. 
                    Si está desactivado, los pedidos quedan en "Recibido" y requieren confirmación del operador.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="requiresPaymentToFulfill"
                  checked={requiresPaymentToFulfill}
                  onCheckedChange={(checked) => setRequiresPaymentToFulfill(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="requiresPaymentToFulfill" className="font-medium cursor-pointer">
                    Requerir pago para preparar
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Solo avanzar con la preparación del pedido cuando el pago esté confirmado. 
                    Si está desactivado, se puede preparar pedidos con pago pendiente (contra entrega).
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="storePickupEnabled"
                  checked={storePickupEnabled}
                  onCheckedChange={(checked) => setStorePickupEnabled(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="storePickupEnabled" className="font-medium cursor-pointer">
                    Habilitar retiro en tienda
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permite a los clientes elegir retirar su pedido en la tienda física (sin costo de envío).
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="minShippingOrderAmount">Monto mínimo para envío a domicilio ($)</Label>
                <Input
                  id="minShippingOrderAmount"
                  type="number"
                  value={minShippingOrderAmount}
                  onChange={(e) => setMinShippingOrderAmount(Number(e.target.value))}
                  min={0}
                  step={100}
                />
                <p className="text-sm text-muted-foreground">
                  El cliente no podrá finalizar la compra con entrega a domicilio si el subtotal es menor a este monto.
                  Pon 0 para que no haya mínimo.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Medios de Pago</CardTitle>
              <CardDescription>Configura los métodos de pago habilitados para tus clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(paymentMethods).map(([key, method]) => (
                <div key={key} className="flex items-start space-x-3">
                  <Checkbox
                    id={`payment-${key}`}
                    checked={method.isActive}
                    onCheckedChange={(checked) => togglePaymentMethod(key, !!checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`payment-${key}`} className="font-medium cursor-pointer">
                      {method.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Link to Shipping Zones */}
          <Card>
            <CardHeader>
              <CardTitle>Zonas de Envío</CardTitle>
              <CardDescription>
                Las zonas de envío ahora se configuran en una página dedicada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/admin/shipping-zones">
                  Administrar Zonas de Entrega →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6 mt-6">
          {/* Logo & Favicon */}
          <Card>
            <CardHeader>
              <CardTitle>Logo y Favicon</CardTitle>
              <CardDescription>Imágenes de tu tienda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin logo</span>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                        <Upload className="h-4 w-4" />
                        Subir logo
                      </div>
                    </Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "logo")}
                    />
                    {logo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-500"
                        onClick={() => { setLogo(null); setLogoPreview(null); }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Favicon */}
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {faviconPreview ? (
                      <img src={faviconPreview} alt="Favicon" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin favicon</span>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="favicon-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                        <Upload className="h-4 w-4" />
                        Subir favicon
                      </div>
                    </Label>
                    <Input
                      id="favicon-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "favicon")}
                    />
                    {favicon && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-500"
                        onClick={() => { setFavicon(null); setFaviconPreview(null); }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
