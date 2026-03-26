"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Package, FileText, Users, Settings, LayoutDashboard, Truck, Home, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

const routes = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/profile", label: "Perfil", icon: User },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/orders", label: "Pedidos", icon: FileText },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/shipping-zones", label: "Zonas de Entrega", icon: Truck },
  { href: "/admin/home", label: "Home", icon: Home },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
]

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-left">Admin Panel</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2">
          {routes.map((route) => {
            const Icon = route.icon
            const isActive = pathname === route.href
            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {route.label}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
