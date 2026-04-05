"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

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
          className={`${
            isMobile ? "text-sm px-4 py-2" : "px-4 py-2"
          } flex-1 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
        />
        <Button
          type="submit"
          isLoading={isPending}
          className={`${
            isMobile ? "px-4 py-2 text-sm" : "px-6 py-2"
          } bg-primary text-primary-foreground font-medium rounded-r-full hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] rounded-l-none`}
        >
          {!isPending && "Buscar"}
        </Button>
      </div>
    </form>
  )
}
