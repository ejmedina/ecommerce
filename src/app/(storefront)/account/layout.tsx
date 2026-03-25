import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, canAccessAdmin } from "@/lib/auth"
import { Package, User, MapPin, LayoutDashboard } from "lucide-react"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  const isAdmin = canAccessAdmin(session.user.role)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mi cuenta</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors mb-4"
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="font-semibold">Ir al Panel Admin</span>
              </Link>
            )}
            <Link
              href="/account"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
            >
              <User className="h-5 w-5" />
              <span>Perfil</span>
            </Link>
            
            {!isAdmin && (
              <>
                <Link
                  href="/account/orders"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
                >
                  <Package className="h-5 w-5" />
                  <span>Mis pedidos</span>
                </Link>
                <Link
                  href="/account/addresses"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Direcciones</span>
                </Link>
              </>
            )}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
