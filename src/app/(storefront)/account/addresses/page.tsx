import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function AddressesPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis direcciones</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Agregar dirección
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tenés direcciones guardadas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{address.label}</CardTitle>
                  {address.isDefault && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Principal
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{address.street} {address.number}</p>
                {address.floor && <p className="text-sm">Piso: {address.floor}</p>}
                {address.apartment && <p className="text-sm">Depto: {address.apartment}</p>}
                <p className="text-sm">{address.city}, {address.state} {address.postalCode}</p>
                {address.instructions && (
                  <p className="text-sm text-muted-foreground mt-2">{address.instructions}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
