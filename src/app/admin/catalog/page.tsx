"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, Edit, Trash2, Loader2, Upload, ChevronRight, ChevronDown, Folder, Tag, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  isActive: boolean
  parentId: string | null
  _count: {
    products: number
    children: number
  }
}

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  isActive: boolean
  _count: {
    products: number
  }
}

interface CategoryNode extends Category {
  children: CategoryNode[]
}

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("categories")

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    image: "",
    isActive: true,
    parentId: "" as string | null,
  })

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [brandForm, setBrandForm] = useState({
    name: "",
    logo: "",
    isActive: true,
  })

  // Tree state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, brandRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/brands")
      ])
      const categoriesData = await catRes.json()
      const brandsData = await brandRes.json()
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      setBrands(Array.isArray(brandsData) ? brandsData : [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Categories Tree Logic
  const categoriesTree = useMemo(() => {
    const buildTree = (parentId: string | null): CategoryNode[] => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }))
    }
    return buildTree(null)
  }, [categories])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Category Actions ---
  const openCreateCategory = (parentId: string | null = null) => {
    setEditingCategory(null)
    setCategoryForm({ name: "", description: "", image: "", isActive: true, parentId })
    setShowCategoryModal(true)
  }

  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      isActive: category.isActive,
      parentId: category.parentId,
    })
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    setSaving(true)
    try {
      const payload = { ...categoryForm, parentId: categoryForm.parentId || null }
      const res = editingCategory
        ? await fetch("/api/admin/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, id: editingCategory.id }),
          })
        : await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        setShowCategoryModal(false)
        loadData()
        toast({ title: "Éxito", description: "Categoría guardada correctamente." })
      } else {
        const data = await res.json()
        toast({ variant: "destructive", title: "Error", description: data.error || "Error al guardar." })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error al guardar." })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`¿Estás seguro de eliminar "${category.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/categories?id=${category.id}`, { method: "DELETE" })
      if (res.ok) {
        loadData()
        toast({ title: "Eliminado", description: "La categoría ha sido eliminada." })
      } else {
        const data = await res.json()
        toast({ variant: "destructive", title: "Error", description: data.error || "Error al eliminar." })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error al eliminar." })
    }
  }

  // --- Brand Actions ---
  const openCreateBrand = () => {
    setEditingBrand(null)
    setBrandForm({ name: "", logo: "", isActive: true })
    setShowBrandModal(true)
  }

  const openEditBrand = (brand: Brand) => {
    setEditingBrand(brand)
    setBrandForm({
      name: brand.name,
      logo: brand.logo || "",
      isActive: brand.isActive,
    })
    setShowBrandModal(true)
  }

  const handleSaveBrand = async () => {
    setSaving(true)
    try {
      const res = editingBrand
        ? await fetch("/api/admin/brands", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...brandForm, id: editingBrand.id }),
          })
        : await fetch("/api/admin/brands", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(brandForm),
          })

      if (res.ok) {
        setShowBrandModal(false)
        loadData()
        toast({ title: "Éxito", description: "Marca guardada correctamente." })
      } else {
        const data = await res.json()
        toast({ variant: "destructive", title: "Error", description: data.error || "Error al guardar." })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error al guardar." })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBrand = async (brand: Brand) => {
    if (!confirm(`¿Estás seguro de eliminar "${brand.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/brands?id=${brand.id}`, { method: "DELETE" })
      if (res.ok) {
        loadData()
        toast({ title: "Eliminado", description: "La marca ha sido eliminada." })
      } else {
        const data = await res.json()
        toast({ variant: "destructive", title: "Error", description: data.error || "Error al eliminar." })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error al eliminar." })
    }
  }

  // --- Image Upload ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'logo') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", field === 'image' ? "category" : "brand")
      const res = await fetch("/api/admin/settings/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        if (field === 'image') setCategoryForm(prev => ({ ...prev, image: data.url }))
        else setBrandForm(prev => ({ ...prev, logo: data.url }))
        toast({ title: "Imagen subida", description: "La imagen se cargó con éxito." })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error al subir imagen." })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-muted-foreground">Administra las marcas y categorías jerárquicas de tu tienda.</p>
        </div>
      </div>

      <Tabs defaultValue="categories" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Categorías</TabsTrigger>
          <TabsTrigger value="brands" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Marcas</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="pt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCreateCategory()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría Raíz
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
               <div className="divide-y">
                 {categoriesTree.length === 0 ? (
                   <div className="p-8 text-center text-muted-foreground">No hay categorías cargadas.</div>
                 ) : (
                   categoriesTree.map(cat => (
                     <CategoryTreeNode 
                       key={cat.id} 
                       node={cat} 
                       expandedIds={expandedIds} 
                       onToggle={toggleExpand} 
                       onEdit={openEditCategory} 
                       onDelete={handleDeleteCategory} 
                       onAddChild={openCreateCategory} 
                     />
                   ))
                 )}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="pt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateBrand}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Marca
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.length === 0 ? (
              <Card className="col-span-full border-dashed p-12 flex flex-col items-center justify-center text-center">
                <Tag className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="font-medium text-lg text-muted-foreground">No hay marcas registradas</h3>
                <p className="text-sm text-muted-foreground">Comienza añadiendo una nueva marca para tus productos.</p>
              </Card>
            ) : (
              brands.map(brand => (
                <Card key={brand.id} className="group overflow-hidden">
                  <div className="aspect-[4/3] bg-muted relative flex items-center justify-center p-6 transition-colors group-hover:bg-muted/80">
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Tag className="h-10 w-10 text-muted-foreground/30" />
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEditBrand(brand)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteBrand(brand)} disabled={brand._count.products > 0}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                       <div className="min-w-0">
                          <h3 className="font-semibold truncate">{brand.name}</h3>
                          <p className="text-xs text-muted-foreground">{brand._count.products} productos</p>
                       </div>
                       {!brand.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Inactiva</span>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* category modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={categoryForm.name} onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Smart TV" />
            </div>

            <div className="space-y-2">
              <Label>Categoría Padre</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={categoryForm.parentId || ""} 
                onChange={e => setCategoryForm(prev => ({ ...prev, parentId: e.target.value || null }))}
              >
                <option value="">Raíz (Sin padre)</option>
                {categories.filter(c => c.id !== editingCategory?.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Imagen</Label>
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 border rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                   {categoryForm.image ? <img src={categoryForm.image} className="w-full h-full object-cover" /> : <Folder className="h-8 w-8 text-muted-foreground/30" />}
                </div>
                <div className="flex-1 space-y-2">
                   <div className="relative">
                      <Button variant="outline" size="sm" className="w-full" disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Subir Imagen
                      </Button>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, 'image')} disabled={uploading} />
                   </div>
                   <Input value={categoryForm.image} onChange={e => setCategoryForm(prev => ({ ...prev, image: e.target.value }))} placeholder="O pega una URL" className="text-xs h-8" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={categoryForm.description || ""} onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="cat-active" checked={categoryForm.isActive} onCheckedChange={v => setCategoryForm(prev => ({ ...prev, isActive: !!v }))} />
              <Label htmlFor="cat-active" className="text-sm font-normal">Categoría activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCategoryModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* brand modal */}
      <Dialog open={showBrandModal} onOpenChange={setShowBrandModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Editar Marca" : "Nueva Marca"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={brandForm.name} onChange={e => setBrandForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Samsung" />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 border rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden p-2">
                   {brandForm.logo ? <img src={brandForm.logo} className="w-full h-full object-contain" /> : <Tag className="h-8 w-8 text-muted-foreground/30" />}
                </div>
                <div className="flex-1 space-y-2">
                   <div className="relative">
                      <Button variant="outline" size="sm" className="w-full" disabled={uploading}>Subir Logo</Button>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, 'logo')} disabled={uploading} />
                   </div>
                   <Input value={brandForm.logo} onChange={e => setBrandForm(prev => ({ ...prev, logo: e.target.value }))} placeholder="URL del logo" className="text-xs h-8" />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="brand-active" checked={brandForm.isActive} onCheckedChange={v => setBrandForm(prev => ({ ...prev, isActive: !!v }))} />
              <Label htmlFor="brand-active" className="text-sm font-normal">Marca activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBrandModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBrand} disabled={saving || !brandForm.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryTreeNode({ 
  node, 
  depth = 0, 
  expandedIds, 
  onToggle, 
  onEdit, 
  onDelete, 
  onAddChild 
}: { 
  node: CategoryNode, 
  depth?: number, 
  expandedIds: Set<string>, 
  onToggle: (id: string) => void, 
  onEdit: (n: any) => void, 
  onDelete: (n: any) => void, 
  onAddChild: (pid: string) => void 
}) {
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "flex items-center group py-3 px-4 hover:bg-muted/30 transition-colors",
          depth > 0 && "bg-muted/5 border-l-2 border-primary/10"
        )}
        style={{ paddingLeft: `${(depth * 1.5) + 1}rem` }}
      >
        <button 
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            "p-1 hover:bg-primary/10 rounded-full text-muted-foreground mr-1 transition-all",
            !hasChildren && "opacity-0 cursor-default"
          )}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 border rounded bg-background flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
            {node.image ? <img src={node.image} className="w-full h-full object-cover" /> : <Folder className="h-5 w-5 text-primary/40" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold truncate">{node.name}</h4>
              {!node.isActive && <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Inactiva" />}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {node._count.products} productos {hasChildren && `| ${node.children.length} subcategorías`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => onAddChild(node.id)} title="Añadir subcategoría">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(node)} title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-500 hover:bg-red-500/10" 
            onClick={() => onDelete(node)}
            disabled={node._count.products > 0 || node.children.length > 0}
            title={node.children.length > 0 ? "No puedes eliminar una categoría con subcategorías" : ""}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child: CategoryNode) => (
            <CategoryTreeNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}
