import Link from "next/link"
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from "@/components/cart-context"
import { CartButton } from "@/components/cart-button"
import { FloatingCart } from "@/components/floating-cart"
import { StoreLogo } from "@/components/store-logo"
import { StorefrontNav } from "@/components/storefront-nav"
import { db } from "@/lib/db"
import { auth, canAccessAdmin } from "@/lib/auth"
import { LayoutDashboard } from "lucide-react"

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAdmin = session?.user?.role ? canAccessAdmin(session.user.role) : false
  // Fetch categories for the navigation
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { order: "asc" },
  })

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Mobile Menu & Logo */}
              <div className="flex items-center gap-2 md:gap-4">
                <StorefrontNav categories={categories} />
                <StoreLogo />
              </div>

              {/* Search Bar (Desktop only) */}
              <div className="hidden md:block flex-1 max-w-xl mx-4">
                <form action="/products" method="get" className="flex">
                  <input
                    type="text"
                    name="s"
                    placeholder="Buscar productos..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-r-full hover:opacity-90 transition-opacity"
                  >
                    Buscar
                  </button>
                </form>
              </div>

              {/* Right Icons */}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link 
                    href="/admin/dashboard" 
                    className="p-2 text-gray-600 hover:text-primary transition-colors flex items-center gap-1"
                    title="Panel de Administración"
                  >
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="hidden lg:inline text-sm font-medium">Panel</span>
                  </Link>
                )}
                <Link href="/account" className="p-2 text-gray-600 hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
                <CartButton />
              </div>
            </div>
            
            {/* Search Bar (Mobile only) */}
            <div className="md:hidden pb-3">
              <form action="/products" method="get" className="flex">
                <input
                  type="text"
                  name="s"
                  placeholder="Buscar productos..."
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-r-full hover:opacity-90 transition-opacity"
                >
                  Buscar
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        <Toaster />
        <FloatingCart />
      </div>
    </CartProvider>
  )
}
