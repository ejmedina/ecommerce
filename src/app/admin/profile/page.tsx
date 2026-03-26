import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ProfileForm } from "@/app/(storefront)/account/profile-form"

export default async function AdminProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      pendingEmail: true,
    },
  })

  if (!user) {
    redirect("/login?error=SessionExpired")
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil de Administrador</h1>
        <p className="text-muted-foreground mt-2">
          Gestioná tus datos personales e información de contacto.
        </p>
      </div>

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
    </div>
  )
}
