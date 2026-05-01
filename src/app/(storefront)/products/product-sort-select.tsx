"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

type SortOption = "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc"

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre: A-Z" },
  { value: "name_desc", label: "Nombre: Z-A" },
]

interface ProductSortSelectProps {
  value: SortOption
}

export function ProductSortSelect({ value }: ProductSortSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleSortChange(nextSort: SortOption) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextSort === "newest") {
      params.delete("sort")
    } else {
      params.set("sort", nextSort)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="product-sort" className="text-sm font-medium text-muted-foreground">
        Ordenar por
      </label>
      <select
        id="product-sort"
        value={value}
        onChange={(event) => handleSortChange(event.target.value as SortOption)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
