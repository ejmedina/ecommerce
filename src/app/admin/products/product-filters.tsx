"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Category {
  id: string
  name: string
}

interface ProductFiltersProps {
  categories: Category[]
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mountedRef = useRef(false)
  
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [category, setCategory] = useState(searchParams.get("category") || "all")
  const [sort, setSort] = useState(searchParams.get("sort") || "date_desc")
  const [discount, setDiscount] = useState(searchParams.get("discount") || "all")
  
  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    const params = new URLSearchParams(window.location.search)
    
    if (debouncedSearch) {
      params.set("search", debouncedSearch)
    } else {
      params.delete("search")
    }
    
    if (category !== "all") {
      params.set("category", category)
    } else {
      params.delete("category")
    }
    
    if (sort !== "date_desc") {
      params.set("sort", sort)
    } else {
      params.delete("sort")
    }

    if (discount !== "all") {
      params.set("discount", discount)
    } else {
      params.delete("discount")
    }
    
    // Al filtrar, siempre volvemos a la página 1
    params.set("page", "1")
    
    router.push(`/admin/products?${params.toString()}`)
  }, [debouncedSearch, category, sort, discount, router])

  return (
    <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="w-full md:w-[200px]">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="w-full md:w-[200px]">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Más recientes</SelectItem>
            <SelectItem value="date_asc">Más antiguos</SelectItem>
            <SelectItem value="price_asc">Precio: Menor a Mayor</SelectItem>
            <SelectItem value="price_desc">Precio: Mayor a Menor</SelectItem>
            <SelectItem value="stock_asc">Stock: Crítico primero</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-[200px]">
        <Select value={discount} onValueChange={setDiscount}>
          <SelectTrigger>
            <SelectValue placeholder="Descuentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los productos</SelectItem>
            <SelectItem value="with_discount">Con descuento (Cualquiera)</SelectItem>
            <SelectItem value="volume_fixed">Descuento por Volumen</SelectItem>
            <SelectItem value="compare_price">Precio Tachado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
