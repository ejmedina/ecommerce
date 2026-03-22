import Link from "next/link"
import { Package, FileText, Users, Settings, LayoutDashboard, Truck } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="border-b p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Panel de Administración</h1>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Ver tienda
          </Link>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
