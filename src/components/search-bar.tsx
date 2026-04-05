"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    startTransition(() => {
      const params = new URLSearchParams()
      params.set("s", query.trim())
      router.push(`/products?${params.toString()}`)
    })
  }

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="flex relative items-center w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex-1 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
            isMobile ? "text-sm px-4 h-10" : "px-4 h-11",
            "border-r-0"
          )}
        />
        <Button
          type="submit"
          isLoading={isPending}
          className={cn(
            "rounded-r-full rounded-l-none font-medium hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px]",
            isMobile ? "px-4 h-10 text-sm" : "px-6 h-11"
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
  )
}
