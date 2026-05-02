"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PriceProductSearchProps {
  defaultValue: string
}

export function PriceProductSearch({ defaultValue }: PriceProductSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const currentSearch = searchParams.get("search") || ""
    const nextSearch = value.trim()

    if (nextSearch === currentSearch) return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())

      if (nextSearch) {
        params.set("search", nextSearch)
      } else {
        params.delete("search")
      }

      params.delete("page")
      const queryString = params.toString()

      startTransition(() => {
        router.replace(queryString ? `/admin/products/prices?${queryString}` : "/admin/products/prices")
      })
    }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [router, searchParams, value])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
          }
        }}
        placeholder="Filtrar por título del producto..."
        autoComplete="off"
        className={`pl-9 ${isPending ? "opacity-70" : ""}`}
      />
    </div>
  )
}
