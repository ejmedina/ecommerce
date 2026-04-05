"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, Edit, Trash2, Loader2, Upload, ChevronRight, ChevronDown, Folder, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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

interface CategoryNode extends Category {
  children: CategoryNode[]
}

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
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

  // Tree state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const catRes = await fetch("/api/admin/categories")
      const categoriesData = await catRes.json()
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las categorías." })
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

  // --- Image Upload ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "category")
      const res = await fetch("/api/admin/settings/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        setCategoryForm(prev => ({ ...prev, image: data.url }))
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
          <p className="text-muted-foreground">Administra las categorías jerárquicas de tu tienda.</p>
        </div>
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
                      <Button variant="outline" size="sm" className="w-full" isLoading={uploading}>
                        {!uploading && <Upload className="h-4 w-4 mr-2" />}
                        Subir Imagen
                      </Button>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={uploading} />
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
            <Button onClick={handleSaveCategory} isLoading={saving} disabled={!categoryForm.name}>Guardar</Button>
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
