import Link from "next/link"
import { redirect } from "next/navigation"
import { Package, FileText, Users, Settings, LayoutDashboard, Truck, Home, LogOut } from "lucide-react"
import { ThemeProvider } from "@/components/theme-provider"
import { db } from "@/lib/db"
import { auth, canAccessAdmin, signOut } from "@/lib/auth"
import { initAdmin } from "@/lib/admin-setup"
import { Button } from "@/components/ui/button"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"

// Initialize admin user on first admin page load
initAdmin()

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication and authorization
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login?returnUrl=/admin")
  }
  
  if (!canAccessAdmin(session.user.role)) {
    redirect("/?error=unauthorized")
  }

  // Get settings for theme colors
  const settings = await db.storeSettings.findFirst()
  let themeColors = null
  if (settings?.themeColors) {
    try {
      themeColors = typeof settings.themeColors === 'string'
        ? JSON.parse(settings.themeColors)
        : settings.themeColors
    } catch (e) {
      console.error("Error parsing theme colors:", e)
    }
  }

  return (
    <ThemeProvider colors={themeColors}>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/40 hidden md:block">
          <div className="p-4">
            <Link href="/admin" className="text-xl font-bold">
              Admin
            </Link>
          </div>
          <nav className="px-2 space-y-1">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/products"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <Package className="h-4 w-4" />
              Productos
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Pedidos
            </Link>
            <Link
              href="/admin/customers"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <Users className="h-4 w-4" />
              Clientes
            </Link>
            <Link
              href="/admin/shipping-zones"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <Truck className="h-4 w-4" />
              Zonas de Entrega
            </Link>
            <Link
              href="/admin/home"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
              Configuración
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <header className="border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AdminMobileNav />
              <h1 className="text-lg font-semibold truncate">Panel de Administración</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[150px]">
                {session.user.email}
              </span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </Button>
              </form>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  )
}
