"use client"

import { useState } from "react"
import { Upload, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { IconPicker } from "@/components/ui/icon-picker"

export interface HeroSlide {
  image: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
}

export interface CategoryCard {
  categoryId?: string
  image: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
}

export interface InfoCard {
  icon: string
  title: string
  description: string
}

export interface HomeSettingsData {
  heroSliderEnabled: boolean
  heroSlides: HeroSlide[]
  categoryCardsEnabled: boolean
  categoryCards: CategoryCard[]
  bestSellersEnabled: boolean
  bestSellersLimit: number
  infoCardsEnabled: boolean
  infoCards: InfoCard[]
}

interface HomeSettingsProps {
  data: HomeSettingsData
  onChange: (data: HomeSettingsData) => void
  onImageUpload: (file: File) => Promise<string | null>
}

export function HomeSettings({ data, onChange, onImageUpload }: HomeSettingsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("hero")

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  // Hero Slides handlers
  const updateHeroSlide = (index: number, field: keyof HeroSlide, value: string) => {
    const newSlides = [...data.heroSlides]
    newSlides[index] = { ...newSlides[index], [field]: value }
    onChange({ ...data, heroSlides: newSlides })
  }

  const addHeroSlide = () => {
    const newSlide: HeroSlide = {
      image: "",
      title: "Nuevo Slide",
      subtitle: "Descripción del slide",
      ctaText: "Ver más",
      ctaLink: "/products",
    }
    onChange({ ...data, heroSlides: [...data.heroSlides, newSlide] })
  }

  const removeHeroSlide = (index: number) => {
    const newSlides = data.heroSlides.filter((_, i) => i !== index)
    onChange({ ...data, heroSlides: newSlides })
  }

  // Category Cards handlers
  const updateCategoryCard = (index: number, field: keyof CategoryCard, value: string) => {
    const newCards = [...data.categoryCards]
    newCards[index] = { ...newCards[index], [field]: value }
    onChange({ ...data, categoryCards: newCards })
  }

  const addCategoryCard = () => {
    const newCard: CategoryCard = {
      image: "",
      title: "Nueva Categoría",
      subtitle: "Descripción",
      ctaText: "Ver más",
      ctaLink: "/products",
    }
    onChange({ ...data, categoryCards: [...data.categoryCards, newCard] })
  }

  const removeCategoryCard = (index: number) => {
    const newCards = data.categoryCards.filter((_, i) => i !== index)
    onChange({ ...data, categoryCards: newCards })
  }

  // Info Cards handlers
  const updateInfoCard = (index: number, field: keyof InfoCard, value: string) => {
    const newCards = [...data.infoCards]
    newCards[index] = { ...newCards[index], [field]: value }
    onChange({ ...data, infoCards: newCards })
  }

  const addInfoCard = () => {
    const newCard: InfoCard = {
      icon: "quality",
      title: "Nueva Tarjeta",
      description: "Descripción de la tarjeta",
    }
    onChange({ ...data, infoCards: [...data.infoCards, newCard] })
  }

  const removeInfoCard = (index: number) => {
    const newCards = data.infoCards.filter((_, i) => i !== index)
    onChange({ ...data, infoCards: newCards })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de la Home</CardTitle>
        <CardDescription>
          Personaliza los componentes de la página principal de tu tienda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero Slider Section */}
        <div className="border rounded-lg">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSection("hero")}
            onKeyDown={(e) => e.key === "Enter" && toggleSection("hero")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex items-center gap-3" onClick={(e) => { e.stopPropagation(); onChange({ ...data, heroSliderEnabled: !data.heroSliderEnabled }) }}>
              <Checkbox checked={data.heroSliderEnabled} />
              <span className="font-medium">Slider Principal</span>
            </div>
            {expandedSection === "hero" ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          
          {expandedSection === "hero" && data.heroSliderEnabled && (
            <div className="p-4 pt-0 space-y-4">
              {data.heroSlides.map((slide, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Slide {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeroSlide(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                    <div className="flex gap-4 items-start">
                      {slide.image && (
                        <div className="w-20 h-20 border rounded overflow-hidden flex-shrink-0 bg-muted">
                          <img 
                            src={slide.image} 
                            alt="Slide preview" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Sin+imagen';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={slide.image}
                            onChange={(e) => updateHeroSlide(index, "image", e.target.value)}
                            placeholder="/uploads/slide.jpg"
                            className="flex-1"
                          />
                          <div className="relative">
                            <Button variant="outline" size="sm" className="h-10">
                              <Upload className="h-4 w-4 mr-2" />
                              Subir
                            </Button>
                            <Input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const url = await onImageUpload(file)
                                  if (url) updateHeroSlide(index, "image", url)
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={slide.title}
                        onChange={(e) => updateHeroSlide(index, "title", e.target.value)}
                        placeholder="Título del slide"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Subtítulo</Label>
                      <Input
                        value={slide.subtitle}
                        onChange={(e) => updateHeroSlide(index, "subtitle", e.target.value)}
                        placeholder="Subtítulo"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Texto del botón</Label>
                      <Input
                        value={slide.ctaText}
                        onChange={(e) => updateHeroSlide(index, "ctaText", e.target.value)}
                        placeholder="Comprar"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Link del botón</Label>
                      <Input
                        value={slide.ctaLink}
                        onChange={(e) => updateHeroSlide(index, "ctaLink", e.target.value)}
                        placeholder="/products"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={addHeroSlide}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Slide
              </Button>
            </div>
          )}
        </div>

        {/* Category Cards Section */}
        <div className="border rounded-lg">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSection("categories")}
            onKeyDown={(e) => e.key === "Enter" && toggleSection("categories")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex items-center gap-3" onClick={(e) => { e.stopPropagation(); onChange({ ...data, categoryCardsEnabled: !data.categoryCardsEnabled }) }}>
              <Checkbox checked={data.categoryCardsEnabled} />
              <span className="font-medium">Tarjetas de Categorías</span>
            </div>
            {expandedSection === "categories" ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          
          {expandedSection === "categories" && data.categoryCardsEnabled && (
            <div className="p-4 pt-0 space-y-4">
              {data.categoryCards.map((card, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Categoría {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategoryCard(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                    <div className="flex gap-4 items-start">
                      {card.image && (
                        <div className="w-20 h-20 border rounded overflow-hidden flex-shrink-0 bg-muted">
                          <img 
                            src={card.image} 
                            alt="Category preview" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Sin+imagen';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={card.image}
                            onChange={(e) => updateCategoryCard(index, "image", e.target.value)}
                            placeholder="/uploads/category.jpg"
                            className="flex-1"
                          />
                          <div className="relative">
                            <Button variant="outline" size="sm" className="h-10">
                              <Upload className="h-4 w-4 mr-2" />
                              Subir
                            </Button>
                            <Input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const url = await onImageUpload(file)
                                  if (url) updateCategoryCard(index, "image", url)
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Título</Label>
                    <Input
                      value={card.title}
                      onChange={(e) => updateCategoryCard(index, "title", e.target.value)}
                      placeholder="Nombre de la categoría"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Subtítulo</Label>
                    <Input
                      value={card.subtitle}
                      onChange={(e) => updateCategoryCard(index, "subtitle", e.target.value)}
                      placeholder="Descripción corta"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Texto del botón</Label>
                      <Input
                        value={card.ctaText}
                        onChange={(e) => updateCategoryCard(index, "ctaText", e.target.value)}
                        placeholder="Ver más"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Link</Label>
                      <Input
                        value={card.ctaLink}
                        onChange={(e) => updateCategoryCard(index, "ctaLink", e.target.value)}
                        placeholder="/products?category=..."
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={addCategoryCard}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Categoría
              </Button>
            </div>
          )}
        </div>

        {/* Best Sellers Section */}
        <div className="border rounded-lg">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSection("bestsellers")}
            onKeyDown={(e) => e.key === "Enter" && toggleSection("bestsellers")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex items-center gap-3" onClick={(e) => { e.stopPropagation(); onChange({ ...data, bestSellersEnabled: !data.bestSellersEnabled }) }}>
              <Checkbox checked={data.bestSellersEnabled} />
              <span className="font-medium">Productos Destacados</span>
            </div>
            {expandedSection === "bestsellers" ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          
          {expandedSection === "bestsellers" && data.bestSellersEnabled && (
            <div className="p-4 pt-0 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Cantidad de productos a mostrar</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={data.bestSellersLimit}
                  onChange={(e) => onChange({ ...data, bestSellersLimit: parseInt(e.target.value) || 6 })}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Cards Section */}
        <div className="border rounded-lg">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleSection("infocards")}
            onKeyDown={(e) => e.key === "Enter" && toggleSection("infocards")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex items-center gap-3" onClick={(e) => { e.stopPropagation(); onChange({ ...data, infoCardsEnabled: !data.infoCardsEnabled }) }}>
              <Checkbox checked={data.infoCardsEnabled} />
              <span className="font-medium">Tarjetas Informativas</span>
            </div>
            {expandedSection === "infocards" ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          
          {expandedSection === "infocards" && data.infoCardsEnabled && (
            <div className="p-4 pt-0 space-y-4">
              {data.infoCards.map((card, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Tarjeta {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInfoCard(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <IconPicker
                    value={card.icon}
                    onChange={(value) => updateInfoCard(index, "icon", value)}
                    label="Ícono"
                  />
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Título</Label>
                    <Input
                      value={card.title}
                      onChange={(e) => updateInfoCard(index, "title", e.target.value)}
                      placeholder="Título de la tarjeta"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Descripción</Label>
                    <Input
                      value={card.description}
                      onChange={(e) => updateInfoCard(index, "description", e.target.value)}
                      placeholder="Descripción de la tarjeta"
                    />
                  </div>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={addInfoCard}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Tarjeta
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
