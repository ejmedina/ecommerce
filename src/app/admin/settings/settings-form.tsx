"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Upload, Trash2, Plus, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { 
  ARGENTINE_PROVINCES, 
  ShippingZone, 
  ShippingConfig,
  getDefaultShippingConfig 
} from "@/lib/shipping"

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
}

export function SettingsForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)

  // Form state
  const [storeName, setStoreName] = useState("")
  const [storeEmail, setStoreEmail] = useState("")
  const [storePhone, setStorePhone] = useState("")
  const [logo, setLogo] = useState<string | null>(null)
  const [favicon, setFavicon] = useState<string | null>(null)
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({ zones: [] })
  const [autoConfirmOrders, setAutoConfirmOrders] = useState(true)
  const [requiresPaymentToFulfill, setRequiresPaymentToFulfill] = useState(false)
  const [whatsappPreArrivalMessage, setWhatsappPreArrivalMessage] = useState("")

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
      setLogo(data.logo)
      setFavicon(data.favicon)
      setAutoConfirmOrders(data.autoConfirmOrders ?? true)
      setRequiresPaymentToFulfill(data.requiresPaymentToFulfill ?? false)
      setWhatsappPreArrivalMessage(data.whatsappPreArrivalMessage || "")
      
      if (data.shippingConfig) {
        setShippingConfig(data.shippingConfig)
      } else {
        setShippingConfig(getDefaultShippingConfig())
      }
      
      if (data.logo) setLogoPreview(data.logo)
      if (data.favicon) setFaviconPreview(data.favicon)
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
          whatsappPreArrivalMessage: whatsappPreArrivalMessage || null,
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </div>

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
        </CardContent>
      </Card>

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
        </CardContent>
      </Card>

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
    </div>
  )
}
