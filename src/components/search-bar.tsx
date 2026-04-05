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
      <div className={cn(
        "flex relative items-center w-full rounded-full border border-gray-300 bg-white transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent overflow-hidden",
        isMobile ? "h-10" : "h-11"
      )}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
  )
}
