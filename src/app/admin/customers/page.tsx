import Link from "next/link"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { promoteCustomerToAdmin, setCustomerBlockedState } from "./actions"

interface Props {
  searchParams: Promise<{
    page?: string
    s?: string
  }>
}

const ITEMS_PER_PAGE = 12

const orderStatusLabels: Record<string, string> = {
  RECEIVED: "Recibido",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY_FOR_DELIVERY: "Listo",
  OUT_FOR_DELIVERY: "En reparto",
  DELIVERED: "Entregado",
  NOT_DELIVERED: "No entregado",
  CANCELLED: "Cancelado",
}

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  AUTHORIZED: "Autorizado",
  PAID: "Pagado",
  PARTIALLY_REFUNDED: "Reemb. parcial",
  REFUNDED: "Reembolsado",
  FAILED: "Fallido",
  VOIDED: "Anulado",
}

function formatAddress(address: {
  label: string
  street: string
  number: string
  floor: string | null
  apartment: string | null
  city: string
  state: string
  postalCode: string
  isDefault: boolean
}) {
  const floorApartment = [address.floor, address.apartment].filter(Boolean).join(" ")
  const streetLine = [address.street, address.number, floorApartment].filter(Boolean).join(" ")
  const locationLine = [address.city, address.state, address.postalCode].filter(Boolean).join(", ")

  return {
    title: address.isDefault ? `${address.label} · Predeterminada` : address.label,
    detail: `${streetLine} · ${locationLine}`,
  }
}

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams
  const currentPage = Number.parseInt(params.page || "1", 10)
  const searchTerm = params.s?.trim() || ""

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [customers, totalItems] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            label: true,
            street: true,
            number: true,
            floor: true,
            apartment: true,
            city: true,
            state: true,
            postalCode: true,
            isDefault: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            orderStatus: true,
            paymentStatus: true,
            createdAt: true,
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Seguimiento de cuentas, domicilios y actividad de compra.</p>
        </div>
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
          <div className="grid gap-4 xl:grid-cols-2">
            {customers.map((customer) => {
              const canPromote = customer.role === "CUSTOMER"
              const isBlocked = customer.status === "BLOCKED" || !customer.isActive

              return (
                <Card key={customer.id}>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base">{customer.name || "Sin nombre"}</CardTitle>
                        <p className="truncate text-sm text-muted-foreground">{customer.email}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone || "Sin teléfono cargado"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={isBlocked ? "warning" : "success"} className="text-[10px]">
                          {isBlocked ? "Bloqueado" : "Activo"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {customer.role === "CUSTOMER" ? "Cliente" : customer.role}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground">Registrado</p>
                        <p className="mt-1 font-medium">{new Date(customer.createdAt).toLocaleDateString("es-AR")}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground">Domicilios</p>
                        <p className="mt-1 font-medium">{customer._count.addresses}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-muted-foreground">Pedidos</p>
                        <p className="mt-1 font-medium">{customer._count.orders}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <section className="space-y-2">
                      <h2 className="text-sm font-medium">Domicilios cargados</h2>
                      {customer.addresses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Todavía no tiene domicilios guardados.</p>
                      ) : (
                        <div className="space-y-2">
                          {customer.addresses.map((address) => {
                            const formattedAddress = formatAddress(address)

                            return (
                              <div key={address.id} className="rounded-md border p-3 text-sm">
                                <p className="font-medium">{formattedAddress.title}</p>
                                <p className="mt-1 text-muted-foreground">{formattedAddress.detail}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>

                    <section className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-medium">Pedidos realizados</h2>
                        {customer._count.orders > 0 ? (
                          <span className="text-xs text-muted-foreground">Mostrando los 5 más recientes</span>
                        ) : null}
                      </div>

                      {customer.orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Todavía no realizó pedidos.</p>
                      ) : (
                        <div className="space-y-2">
                          {customer.orders.map((order) => (
                            <Link
                              key={order.id}
                              href={`/admin/orders/${order.id}`}
                              className="flex flex-col gap-2 rounded-md border p-3 transition-colors hover:bg-muted/40"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">#{order.orderNumber}</p>
                                <p className="text-sm font-medium">
                                  {Number(order.total).toLocaleString("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                    minimumFractionDigits: 0,
                                  })}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{new Date(order.createdAt).toLocaleDateString("es-AR")}</span>
                                <span>{orderStatusLabels[order.orderStatus] || order.orderStatus}</span>
                                <span>{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="flex flex-wrap gap-2 border-t pt-4">
                      {canPromote ? (
                        <form action={promoteCustomerToAdmin.bind(null, customer.id)}>
                          <Button type="submit" variant="outline" size="sm">
                            Convertir en admin
                          </Button>
                        </form>
                      ) : null}

                      <form action={setCustomerBlockedState.bind(null, customer.id, !isBlocked)}>
                        <Button type="submit" variant={isBlocked ? "outline" : "destructive"} size="sm">
                          {isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
                        </Button>
                      </form>
                    </section>
                  </CardContent>
                </Card>
              )
            })}
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
