"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Trash2, Save, Loader2, ArrowLeft, AlertTriangle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { createProduct, updateProduct, deleteProduct } from "@/lib/actions/product-actions"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface Category {
  id: string
  name: string
  slug: string
}

interface Brand {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  stock: number
  price: any
  comparePrice: any | null
  description: string | null
  categoryId: string | null
  brandId: string | null
  metaTitle: string | null
  metaDescription: string | null
  isActive: boolean
  isFeatured: boolean
  images: { id: string; url: string; alt: string | null }[]
}

interface ProductFormProps {
  product?: Product
  categories: Category[]
  brands: Brand[]
  onCategoriesChange?: (categories: Category[]) => void
  onBrandsChange?: (brands: Brand[]) => void
}

export function ProductForm({ product, categories, brands, onCategoriesChange, onBrandsChange }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!product
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Inline create states
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newBrandName, setNewBrandName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)

  // Form state
  const [name, setName] = useState(product?.name || "")
  const [sku, setSku] = useState(product?.sku || "")
  const [stock, setStock] = useState(product?.stock?.toString() || "0")
  const [price, setPrice] = useState(product?.price?.toString() || "")
  const [comparePrice, setComparePrice] = useState(product?.comparePrice?.toString() || "")
  const [description, setDescription] = useState(product?.description || "")
  const [categoryId, setCategoryId] = useState(product?.categoryId || "")
  const [brandId, setBrandId] = useState(product?.brandId || "")
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle || "")
  const [metaDescription, setMetaDescription] = useState(product?.metaDescription || "")
  const [isActive, setIsActive] = useState(product?.isActive || false)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured || false)
  const [images, setImages] = useState<{ url: string; alt: string }[]>(
    product?.images?.map(img => ({ url: img.url, alt: img.alt || "" })) || []
  )
  const [uploading, setUploading] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set("name", name)
      formData.set("sku", sku)
      formData.set("stock", stock)
      formData.set("price", price)
      if (comparePrice) formData.set("comparePrice", comparePrice)
      if (description) formData.set("description", description)
      if (categoryId) formData.set("categoryId", categoryId)
      if (brandId) formData.set("brandId", brandId)
      if (metaTitle) formData.set("metaTitle", metaTitle)
      if (metaDescription) formData.set("metaDescription", metaDescription)
      formData.set("isActive", isActive ? "1" : "0")
      formData.set("isFeatured", isFeatured ? "1" : "0")
      if (images.length > 0) {
        formData.set("imageUrl", images[0].url)
        formData.set("imageAlt", images[0].alt || name)
      }

      let result
      if (isEditing) {
        formData.set("id", product.id)
        result = await updateProduct(formData)
      } else {
        result = await createProduct(formData)
      }

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
      } else {
        router.push("/admin/products")
        router.refresh()
      }
    } catch (error) {
      console.error("Save error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al guardar",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!product) return
    setDeleting(true)
    try {
      const result = await deleteProduct(product.id)
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
      } else {
        router.push("/admin/products")
        router.refresh()
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar",
      })
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", "product")

        const res = await fetch("/api/admin/settings/upload", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()
        if (data.url) {
          setImages(prev => [...prev, { url: data.url, alt: name || "" }])
          toast({
            variant: "success",
            title: "Imagen subida",
            description: "Imagen cargada y optimizada correctamente",
          })
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir imagen",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // Inline category creation
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      })
      const data = await res.json()
      if (data.id) {
        const newCategory = { id: data.id, name: data.name, slug: data.slug }
        setCategoryId(data.id)
        if (onCategoriesChange) {
          onCategoriesChange([...categories, newCategory])
        }
        setNewCategoryName("")
        setShowNewCategory(false)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Error al crear categoría",
        })
      }
    } catch (error) {
      console.error("Create category error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al crear categoría",
      })
    } finally {
      setCreatingCategory(false)
    }
  }

  // Inline brand creation
  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return
    setCreatingBrand(true)
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName }),
      })
      const data = await res.json()
      if (data.id) {
        const newBrand = { id: data.id, name: data.name, slug: data.slug }
        setBrandId(data.id)
        if (onBrandsChange) {
          onBrandsChange([...brands, newBrand])
        }
        setNewBrandName("")
        setShowNewBrand(false)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Error al crear marca",
        })
      }
    } catch (error) {
      console.error("Create brand error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al crear marca",
      })
    } finally {
      setCreatingBrand(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="flex-1">
                <p className="font-medium">¿Estás seguro de eliminar este producto?</p>
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del producto *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Remera oversize"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ej: REM-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    min={0}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del producto..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comparePrice">Precio de comparación</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="comparePrice"
                      type="number"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Precio original para mostrar como oferta
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Organización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category">Categoría</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowNewCategory(!showNewCategory)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Nueva
                    </Button>
                  </div>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nombre de la categoría"
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleCreateCategory}
                        disabled={creatingCategory || !newCategoryName.trim()}
                      >
                        {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
                      </Button>
                    </div>
                  ) : (
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-10 px-3 border rounded-md bg-background"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="brand">Marca</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowNewBrand(!showNewBrand)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Nueva
                    </Button>
                  </div>
                  {showNewBrand ? (
                    <div className="flex gap-2">
                      <Input
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        placeholder="Nombre de la marca"
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleCreateBrand}
                        disabled={creatingBrand || !newBrandName.trim()}
                      >
                        {creatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
                      </Button>
                    </div>
                  ) : (
                    <select
                      id="brand"
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      className="w-full h-10 px-3 border rounded-md bg-background"
                    >
                      <option value="">Sin marca</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>
                Configurá cómo aparece el producto en buscadores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta título</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Título para buscadores (máx 60 caracteres)"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {metaTitle.length}/60 caracteres
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta descripción</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Descripción para buscadores (máx 160 caracteres)"
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {metaDescription.length}/160 caracteres
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Producto activo
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Los productos inactivos no son visibles en la tienda
              </p>
              <Separator />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFeatured"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setIsFeatured(!!checked)}
                />
                <Label htmlFor="isFeatured" className="cursor-pointer">
                  Producto destacado
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Los productos destacados aparecen en la página principal
              </p>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Imágenes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing images */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square border rounded-lg overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.alt || name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new image */}
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed rounded-lg hover:bg-muted transition-colors">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Subir imagen
                        </span>
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG o WebP. Primera imagen será la principal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
