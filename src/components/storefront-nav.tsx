"use client"

import Link from "next/link"
import { Menu, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Category {
  id: string
  name: string
  slug: string
}

interface StorefrontNavProps {
  categories: Category[]
}

export function StorefrontNav({ categories }: StorefrontNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
             <SheetHeader>
              <SheetTitle className="text-left">Menú</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 mt-8">
              <Link 
                href="/products" 
                className="text-lg font-medium hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Todos los productos
              </Link>
              <div className="text-lg font-medium mt-4">Categorías</div>
              <div className="flex flex-col gap-2 pl-4 border-l-2 ml-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="text-base text-gray-600 hover:text-primary transition-colors py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
                {categories.length === 0 && (
                  <div className="text-muted-foreground text-sm">No hay categorías</div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Menu */}
      <nav className="hidden md:flex items-center gap-1">
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
    </>
  )
}
