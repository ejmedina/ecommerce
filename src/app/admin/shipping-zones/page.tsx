"use client"

import { useState, useEffect } from "react"
import { Upload, Trash2, Plus, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { 
  ARGENTINE_PROVINCES, 
  ShippingZone, 
  ShippingConfig,
  getDefaultShippingConfig 
} from "@/lib/shipping"

interface ShippingZonesPageProps {
  // No props needed - uses client-side state
}

export default function ShippingZonesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({ zones: [] })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      
      if (data.shippingConfig) {
        setShippingConfig(data.shippingConfig)
      } else {
        setShippingConfig(getDefaultShippingConfig())
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
      // First get current settings to get ID
      const res = await fetch("/api/admin/settings")
      const settings = await res.json()

      const saveRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings.id,
          shippingConfig,
        }),
      })

      if (saveRes.ok) {
        toast({
          variant: "success",
          title: "Éxito",
          description: "Zonas de envío guardadas",
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
        <div>
          <h1 className="text-2xl font-bold">Zonas de Entrega</h1>
          <p className="text-muted-foreground">
            Configura el costo de envío por zona geográfica.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zonas de Envío</CardTitle>
          <CardDescription>
            Configura el costo de envío por zona. Para Buenos Aires, las ciudades se dividen automáticamente en zonas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shippingConfig.zones.map((zone, index) => (
            <div key={zone.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={zone.isActive}
                    onCheckedChange={(checked) => updateZone(index, { isActive: !!checked })}
                  />
                  <Input
                    value={zone.name}
                    onChange={(e) => updateZone(index, { name: e.target.value })}
                    className="w-48 font-medium"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => removeZone(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Costo de envío ($)</Label>
                  <Input
                    type="number"
                    value={zone.cost}
                    onChange={(e) => updateZone(index, { cost: Number(e.target.value) })}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Envío gratis desde ($)</Label>
                  <Input
                    type="number"
                    value={zone.freeFrom || ""}
                    onChange={(e) => updateZone(index, { freeFrom: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Vacío = no aplica"
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Provincias</Label>
                <div className="flex flex-wrap gap-2">
                  {ARGENTINE_PROVINCES.map((province) => (
                    <Button
                      key={province.id}
                      variant={zone.provinces.includes(province.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProvince(index, province.id)}
                      className="text-xs"
                    >
                      {province.name}
                    </Button>
                  ))}
                </div>
              </div>

              {zone.provinces.includes("BUENOS_AIRES") && (
                <div className="space-y-2">
                  <Label>Ciudades específicas (opcional)</Label>
                  <Textarea
                    value={zone.cities?.join(", ") || ""}
                    onChange={(e) => updateZone(index, { 
                      cities: e.target.value ? e.target.value.split(",").map(c => c.trim()) : undefined 
                    })}
                    placeholder="Ciudad1, Ciudad2 (dejar vacío para toda la provincia)"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa las ciudades con comas. Si está vacío, la zona aplica a toda la provincia.
                  </p>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addZone} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar zona
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
