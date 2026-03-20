import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth"

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      addresses: true,
      orders: { take: 5, orderBy: { createdAt: "desc" } },
    },
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Nombre:</strong> {user.name || "No definido"}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Teléfono:</strong> {user.phone || "No definido"}</p>
          <p><strong>Miembro desde:</strong> {new Date(user.createdAt).toLocaleDateString("es-AR")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-2xl font-bold">{user.orders.length}</p>
            <p className="text-sm text-muted-foreground">Pedidos realizados</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-2xl font-bold">{user.addresses.length}</p>
            <p className="text-sm text-muted-foreground">Direcciones guardadas</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}>
            <Button type="submit" variant="destructive">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
