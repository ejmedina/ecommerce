import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Edit, PackageSearch } from "lucide-react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  params: Promise<{ id: string }>
}

function formatAddress(address: {
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

export default async function UserAddressesPage({ params }: Props) {
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          shippingAddress: true,
        },
      },
    },
  })

  if (!user) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a usuarios
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Domicilios de entrega</h1>
          <p className="text-sm text-muted-foreground">{user.name || user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/orders?userId=${user.id}`}>
            <Button variant="outline">
              <PackageSearch className="h-4 w-4 mr-1.5" />
              Ver pedidos
            </Button>
          </Link>
          <Link href={`/admin/users/${user.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-1.5" />
              Editar usuario
            </Button>
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Domicilios guardados</h2>
        {user.addresses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Este usuario no tiene domicilios guardados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {user.addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{address.label}</h3>
                    {address.isDefault ? <Badge variant="secondary">Predeterminado</Badge> : null}
                  </div>
                  <p className="text-sm">{formatAddress(address)}</p>
                  {address.instructions ? (
                    <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      {address.instructions}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Últimos domicilios usados en pedidos</h2>
        {user.orders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Todavía no hay pedidos con domicilio de entrega.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {user.orders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium">#{order.orderNumber}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                      {JSON.stringify(order.shippingAddress, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
