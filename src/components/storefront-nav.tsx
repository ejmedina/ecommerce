"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Category {
  id: string
  name: string
  slug: string
}

interface StorefrontNavProps {
  categories: Category[]
}

export function StorefrontNav({ categories }: StorefrontNavProps) {
  return (
    <nav className="flex items-center gap-1">
      {/* Tienda link */}
        <Link
        href="/products"
        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors rounded-md hover:bg-gray-100"
      >
        Tienda
      </Link>

      {/* Categories dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors rounded-md hover:bg-gray-100">
          Categorías
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {categories.map((category) => (
            <DropdownMenuItem key={category.id} asChild>
              <Link
                href={`/products?category=${category.slug}`}
                className="cursor-pointer"
              >
                {category.name}
              </Link>
            </DropdownMenuItem>
          ))}
          {categories.length === 0 && (
            <DropdownMenuItem disabled>
              No hay categorías
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
