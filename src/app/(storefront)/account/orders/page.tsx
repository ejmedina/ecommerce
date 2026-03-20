import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function OrdersPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  })

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      PENDING: "warning",
      PAID: "success",
      PROCESSING: "default",
      SHIPPED: "default",
      DELIVERED: "success",
      CANCELLED: "destructive",
      REFUNDED: "destructive",
    }
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      PAID: "Pagado",
      PROCESSING: "Procesando",
      SHIPPED: "Enviado",
      DELIVERED: "Entregado",
      CANCELLED: "Cancelado",
      REFUNDED: "Reembolsado",
    }
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
  }

  if (orders.length === 0) {
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
      
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Pedido #{order.orderNumber}
              </CardTitle>
              {getStatusBadge(order.status)}
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
  )
}
