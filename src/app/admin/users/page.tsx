import Link from "next/link"
import { Prisma, UserRole } from "@prisma/client"
import { Edit, Home, MapPin, PackageSearch } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserActionButtons } from "./user-action-buttons"

interface Props {
  searchParams: Promise<{
    page?: string
    s?: string
    role?: string
    status?: string
  }>
}

const ITEMS_PER_PAGE = 12

const roleLabels: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  OWNER: "Dueño",
  ADMIN: "Admin",
  CUSTOMER: "Usuario",
}

function formatShippingAddress(address: Prisma.JsonValue | null | undefined) {
  if (!address || typeof address !== "object" || Array.isArray(address)) return null

  const data = address as Record<string, unknown>
  const streetLine = [data.street, data.number, data.floor, data.apartment]
    .filter(Boolean)
    .join(" ")
  const locationLine = [data.city, data.state, data.postalCode]
    .filter(Boolean)
    .join(", ")

  return [streetLine, locationLine].filter(Boolean).join(" · ") || null
}

function formatSavedAddress(address: {
  street: string
  number: string
  floor: string | null
  apartment: string | null
  city: string
  state: string
  postalCode: string
}) {
  const streetLine = [address.street, address.number, address.floor, address.apartment].filter(Boolean).join(" ")
  const locationLine = [address.city, address.state, address.postalCode].filter(Boolean).join(", ")

  return [streetLine, locationLine].filter(Boolean).join(" · ")
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams
  const session = await auth()
  const currentPage = Number.parseInt(params.page || "1", 10)
  const searchTerm = params.s?.trim() || ""
  const roleFilter = params.role && params.role !== "all" ? params.role : undefined
  const statusFilter = params.status && params.status !== "all" ? params.status : undefined

  const where: Prisma.UserWhereInput = {
    AND: [
      roleFilter && roleFilter in UserRole ? { role: roleFilter as UserRole } : {},
      statusFilter === "blocked" ? { status: "BLOCKED" } : {},
      statusFilter === "pending" ? { status: "ACTIVE", isActive: false } : {},
      statusFilter === "active" ? { status: "ACTIVE", isActive: true } : {},
      searchTerm
        ? {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
              { phone: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  }

  const [users, totalItems] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          take: 1,
          select: {
            street: true,
            number: true,
            floor: true,
            apartment: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            createdAt: true,
            shippingAddress: true,
          },
        },
        _count: {
          select: {
            addresses: true,
            orders: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas, permisos, bloqueo de acceso y datos básicos de entrega.
          </p>
        </div>

        <form className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_160px_160px_auto] xl:w-[760px]">
          <Input name="s" placeholder="Buscar por nombre, email o teléfono..." defaultValue={searchTerm} />
          <select
            name="role"
            defaultValue={roleFilter || "all"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todos los roles</option>
            <option value="CUSTOMER">Usuarios</option>
            <option value="ADMIN">Admins</option>
            <option value="OWNER">Dueños</option>
            <option value="SUPERADMIN">Superadmins</option>
          </select>
          <select
            name="status"
            defaultValue={statusFilter || "all"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes de activación</option>
            <option value="blocked">Bloqueados</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? "No se encontraron usuarios con esos términos." : "No hay usuarios para mostrar."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {users.map((user) => {
              const isManuallyBlocked = user.status === "BLOCKED"
              const isPendingActivation =
                !isManuallyBlocked &&
                !user.isActive &&
                user.importedFromWooCommerce &&
                user.requiresPasswordSetup
              const isPendingVerification = !isManuallyBlocked && !isPendingActivation && !user.isActive
              const latestOrder = user.orders[0]
              const latestShippingAddress = formatShippingAddress(latestOrder?.shippingAddress)
              const fallbackAddress = user.addresses[0] ? formatSavedAddress(user.addresses[0]) : null
              const canChangeRole = user.role === "CUSTOMER" || user.role === "ADMIN"
              const canBlock = user.role !== "SUPERADMIN" && user.role !== "OWNER" && user.id !== session?.user?.id

              return (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="space-y-5 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-base font-semibold">{user.name || "Sin nombre"}</h2>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.phone || "Sin teléfono cargado"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isManuallyBlocked ? (
                          <Badge variant="warning">Bloqueado</Badge>
                        ) : isPendingActivation ? (
                          <Badge variant="secondary">Pendiente de activación</Badge>
                        ) : isPendingVerification ? (
                          <Badge variant="secondary">Pendiente de verificación</Badge>
                        ) : (
                          <Badge variant="success">Activo</Badge>
                        )}
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-md border p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Último domicilio de entrega
                          </p>
                          <p className="mt-1 text-sm">
                            {latestShippingAddress || fallbackAddress || "Sin domicilio de entrega registrado"}
                          </p>
                          {latestOrder ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Usado el {new Date(latestOrder.createdAt).toLocaleDateString("es-AR")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground">Pedidos</p>
                        <p className="mt-1 font-medium">{user._count.orders}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground">Domicilios guardados</p>
                        <p className="mt-1 font-medium">{user._count.addresses}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Link href={`/admin/orders?userId=${user.id}`}>
                        <Button variant="outline" size="sm">
                          <PackageSearch className="h-4 w-4 mr-1.5" />
                          Ver pedidos
                        </Button>
                      </Link>
                      <Link href={`/admin/users/${user.id}/addresses`}>
                        <Button variant="outline" size="sm">
                          <Home className="h-4 w-4 mr-1.5" />
                          Ver domicilios
                        </Button>
                      </Link>
                      <Link href={`/admin/users/${user.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1.5" />
                          Editar
                        </Button>
                      </Link>
                      <UserActionButtons
                        userId={user.id}
                        role={user.role}
                        isBlocked={isManuallyBlocked}
                        canChangeRole={canChangeRole}
                        canBlock={canBlock}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            basePath="/admin/users"
          />
        </>
      )}
    </div>
  )
}
