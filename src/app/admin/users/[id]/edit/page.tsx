import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateUserProfile } from "../../actions"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: Props) {
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true,
    },
  })

  if (!user) notFound()

  const roleIsProtected = user.role === "SUPERADMIN" || user.role === "OWNER"
  const isBlocked = user.status === "BLOCKED" || !user.isActive

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a usuarios
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Editar usuario</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{user.name || user.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUserProfile.bind(null, user.id)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={user.name || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" defaultValue={user.phone || ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  name="role"
                  defaultValue={user.role}
                  disabled={roleIsProtected}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                >
                  <option value="CUSTOMER">Usuario regular</option>
                  <option value="ADMIN">Admin</option>
                  {roleIsProtected ? <option value={user.role}>{user.role}</option> : null}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={isBlocked ? "BLOCKED" : "ACTIVE"}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="BLOCKED">Bloqueado</option>
                </select>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Registrado el {new Date(user.createdAt).toLocaleDateString("es-AR")}.
              {roleIsProtected ? " Este rol está protegido y no se cambia desde esta pantalla." : null}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Link href="/admin/users">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit">
                <Save className="h-4 w-4 mr-1.5" />
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
