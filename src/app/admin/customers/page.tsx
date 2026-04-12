import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { Badge } from "@/components/ui/badge"

interface Props {
  searchParams: Promise<{
    page?: string
    s?: string
  }>
}

const ITEMS_PER_PAGE = 12

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams
  const currentPage = parseInt(params.page || "1")
  const searchTerm = params.s || ""

  const where: any = { 
    role: "CUSTOMER",
    OR: searchTerm ? [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
      { phone: { contains: searchTerm, mode: "insensitive" } },
    ] : undefined
  }

  const [customers, totalItems] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    db.user.count({ where })
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <form className="flex-1 max-w-sm">
          <Input 
            name="s" 
            placeholder="Buscar por nombre, email o teléfono..." 
            defaultValue={searchTerm}
          />
        </form>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? "No se encontraron clientes con esos términos." : "No hay clientes todavía."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <Card key={customer.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate pr-2">
                      {customer.name || "Sin nombre"}
                    </CardTitle>
                    {customer.isActive ? (
                      <Badge variant="success" className="text-[10px]">Activo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <p className="truncate"><strong>Email:</strong> {customer.email}</p>
                    <p><strong>Teléfono:</strong> {customer.phone || "No registrado"}</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Registrado: {new Date(customer.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <PaginationControls 
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            basePath="/admin/customers"
          />
        </>
      )}
    </div>
  )
}

