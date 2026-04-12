import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/pagination"

interface Props {
  searchParams: Promise<{ page?: string }>
}

const ITEMS_PER_PAGE = 10

export default async function OrdersPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const params = await searchParams
  const currentPage = parseInt(params.page || "1")

  const [orders, totalItems] = await Promise.all([
    db.order.findMany({
      where: { userId: session.user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    db.order.count({ where: { userId: session.user.id } })
  ])

  function getOrderStatusBadge(status: string) {
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      RECEIVED: "warning",
      CONFIRMED: "default",
      PREPARING: "warning",
      READY_FOR_DELIVERY: "warning",
      OUT_FOR_DELIVERY: "default",
      DELIVERED: "success",
      NOT_DELIVERED: "destructive",
      CANCELLED: "destructive",
    }
    const labels: Record<string, string> = {
      RECEIVED: "Recibido",
      CONFIRMED: "Confirmado",
      PREPARING: "En preparación",
      READY_FOR_DELIVERY: "Listo para entregar",
      OUT_FOR_DELIVERY: "En reparto",
      DELIVERED: "Entregado",
      NOT_DELIVERED: "No entregado",
      CANCELLED: "Cancelado",
    }
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
  }

  if (orders.length === 0 && currentPage === 1) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-6">Aún no tenés pedidos</p>
        <Button asChild>
          <Link href="/products">Empezar a comprar</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Mis pedidos</h2>
      
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Pedido #{order.orderNumber}
                </CardTitle>
                {getOrderStatusBadge(order.orderStatus)}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(order.createdAt)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {order.items.length} producto{order.items.length !== 1 ? "s" : ""}
                  </p>
                  <p className="font-semibold">{formatCurrency(Number(order.total))}</p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/account/orders/${order.id}`}>Ver detalle</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  )
}

