"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils/index"
import { searchProducts } from "@/lib/actions/product-actions"
import Image from "next/image"
import Link from "next/link"

interface SearchBarProps {
  className?: string
  placeholder?: string
  isMobile?: boolean
}

export function SearchBar({ className, placeholder = "Buscar productos...", isMobile = false }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("s") || "")
  const [isPending, startTransition] = useTransition()
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await searchProducts(query.trim())
        setSuggestions(results)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setShowSuggestions(false)
    startTransition(() => {
      const params = new URLSearchParams()
      params.set("s", query.trim())
      router.push(`/products?${params.toString()}`)
    })
  }

  return (
    <div ref={wrapperRef} className={cn("relative z-50", className)}>
      <form onSubmit={handleSearch}>
        <div className={cn(
          "flex relative items-center w-full rounded-full border border-gray-300 bg-white transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent overflow-hidden",
          isMobile ? "h-10" : "h-11"
        )}>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setShowSuggestions(true)
            }}
            placeholder={placeholder}
            className={cn(
              "flex-1 bg-transparent border-none rounded-l-full focus:outline-none focus:ring-0 transition-all",
              isMobile ? "text-sm px-4 h-full" : "px-4 h-full"
            )}
          />
          <Button
            type="submit"
            isLoading={isPending}
            className={cn(
              "rounded-r-full rounded-l-none font-medium hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px] h-full shadow-none",
              isMobile ? "px-4 text-sm" : "px-6"
            )}
          >
            {!isPending && (
              <>
                <Search className="mr-2 h-4 w-4" />
                <span>Buscar</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showSuggestions && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Buscando...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-0"
                    onClick={() => {
                      setShowSuggestions(false)
                      setQuery(product.name)
                    }}
                  >
                    <div className="relative w-12 h-12 bg-muted rounded shrink-0 overflow-hidden">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center">
                          Sin img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        {formatCurrency(Number(product.price))}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full p-3 text-sm text-center text-primary font-medium hover:bg-gray-50 bg-gray-50/50"
                >
                  Ver todos los resultados
                </button>
              </li>
            </ul>
          ) : (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No se encontraron productos.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
