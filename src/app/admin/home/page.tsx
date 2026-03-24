"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HomeSettings, type HomeSettingsData } from "@/components/admin/home-settings"

// Default home settings
const defaultHomeSettings: HomeSettingsData = {
  heroSliderEnabled: true,
  heroSlides: [
    {
      image: "/uploads/store/slide-default.jpg",
      title: "Artesano",
      subtitle: "Si es rico solo, es rico con todo.",
      ctaText: "Comprar",
      ctaLink: "/products",
    },
  ],
  categoryCardsEnabled: true,
  categoryCards: [
    {
      image: "/uploads/store/category-panificados.jpg",
      title: "Panificados",
      subtitle: "Disfrutá del sabor casero.",
      ctaText: "Comprar ahora",
      ctaLink: "/products?category=panificados",
    },
    {
      image: "/uploads/store/category-dulces.jpg",
      title: "Dulces",
      subtitle: "El sabor que alegra tus tardes.",
      ctaText: "Comprar ahora",
      ctaLink: "/products?category=dulces",
    },
    {
      image: "/uploads/store/category-salados.jpg",
      title: "Salados",
      subtitle: "Opciones para picar en cualquier momento.",
      ctaText: "Comprar ahora",
      ctaLink: "/products?category=salados",
    },
    {
      image: "/uploads/store/category-snacks.jpg",
      title: "Snacks",
      subtitle: "Snackeá sin parar.",
      ctaText: "Comprar ahora",
      ctaLink: "/products?category=snacks",
    },
  ],
  bestSellersEnabled: true,
  bestSellersLimit: 6,
  infoCardsEnabled: true,
  infoCards: [
    {
      icon: "quality",
      title: "La mejor calidad, en casa",
      description: "Una cuidada selección de productos premium, con entrega directa a tu hogar.",
    },
    {
      icon: "price",
      title: "Lo rico, a buen precio",
      description: "Directo desde la fábrica a tu hogar. La mejor calidad, precios que hacen bien.",
    },
    {
      icon: "delivery",
      title: "Lo pedís, te lo llevamos",
      description: "Pedí fácil y recibilo sin cargo en Zona Norte. Para compras mínimas de $40.000.",
    },
  ],
}

export default function HomeSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<{ id: string } | null>(null)
  const [homeSettings, setHomeSettings] = useState<HomeSettingsData>(defaultHomeSettings)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      setSettings({ id: data.id })

      // Parse JSON fields that might come as strings from the database
      const parseJsonField = (field: any, defaultValue: any[] = []) => {
        if (Array.isArray(field)) return field
        if (typeof field === 'string') {
          try {
            return JSON.parse(field)
          } catch {
            return defaultValue
          }
        }
        return defaultValue
      }

      // Load saved settings or use defaults
      setHomeSettings({
        heroSliderEnabled: data.heroSliderEnabled ?? defaultHomeSettings.heroSliderEnabled,
        heroSlides: parseJsonField(data.heroSlides, defaultHomeSettings.heroSlides),
        categoryCardsEnabled: data.categoryCardsEnabled ?? defaultHomeSettings.categoryCardsEnabled,
        categoryCards: parseJsonField(data.categoryCards, defaultHomeSettings.categoryCards),
        bestSellersEnabled: data.bestSellersEnabled ?? defaultHomeSettings.bestSellersEnabled,
        bestSellersLimit: data.bestSellersLimit ?? defaultHomeSettings.bestSellersLimit,
        infoCardsEnabled: data.infoCardsEnabled ?? defaultHomeSettings.infoCardsEnabled,
        infoCards: parseJsonField(data.infoCards, defaultHomeSettings.infoCards),
      })
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar la configuración",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings.id,
          heroSliderEnabled: homeSettings.heroSliderEnabled,
          heroSlides: homeSettings.heroSlides,
          categoryCardsEnabled: homeSettings.categoryCardsEnabled,
          categoryCards: homeSettings.categoryCards,
          bestSellersEnabled: homeSettings.bestSellersEnabled,
          bestSellersLimit: homeSettings.bestSellersLimit,
          infoCardsEnabled: homeSettings.infoCardsEnabled,
          infoCards: homeSettings.infoCards,
        }),
      })

      if (res.ok) {
        toast({
          variant: "success",
          title: "Éxito",
          description: "Configuración de la home guardada",
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

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", `home-${Date.now()}`)

    try {
      const res = await fetch("/api/admin/settings/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (data.url) {
        return data.url
      }
      return null
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir imagen",
      })
      return null
    }
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
          <h1 className="text-2xl font-bold">Configuración de la Home</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personaliza los componentes de la página principal
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

      <HomeSettings
        data={homeSettings}
        onChange={setHomeSettings}
        onImageUpload={handleImageUpload}
      />
    </div>
  )
}
