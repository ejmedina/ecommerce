import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signOut } from "@/lib/auth"
import { ProfileForm } from "./profile-form"

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const [user, orderCount, addressCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pendingEmail: true,
        createdAt: true,
      },
    }),
    db.order.count({
      where: { userId: session.user.id },
    }),
    db.address.count({
      where: { userId: session.user.id },
    }),
  ])

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>
            Actualizá tu información personal. Si cambiás tu email, deberás verificarlo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-2xl font-bold">{orderCount}</p>
            <p className="text-sm text-muted-foreground">Pedidos realizados</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-2xl font-bold">{addressCount}</p>
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
