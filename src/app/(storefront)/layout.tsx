import Link from "next/link"
import { User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from "@/components/cart-context"
import { CartButton } from "@/components/cart-button"
import { FloatingCart } from "@/components/floating-cart"
import { StoreLogo } from "@/components/store-logo"

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <StoreLogo />

              {/* Navigation - Desktop */}
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/products" className="text-sm hover:underline">
                  Productos
                </Link>
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <CartButton />
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/account">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || "Mi Tienda"}. Todos los derechos reservados.</p>
          </div>
        </footer>

        <Toaster />
        <FloatingCart />
      </div>
    </CartProvider>
  )
}
