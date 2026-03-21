import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CustomersPage() {
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clientes</h1>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay clientes todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{customer.name || "Sin nombre"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><strong>Email:</strong> {customer.email}</p>
                  <p><strong>Teléfono:</strong> {customer.phone || "No registrado"}</p>
                  <p><strong>Estado:</strong> {customer.isActive ? "Activo" : "Inactivo"}</p>
                  <p><strong>Registrado:</strong> {new Date(customer.createdAt).toLocaleDateString("es-AR")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
