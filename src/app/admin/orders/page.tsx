import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pedidos</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay pedidos todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`}>
              <Card className="hover:bg-muted/50 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === "DELIVERED" ? "bg-green-100 text-green-800" :
                      order.status === "SHIPPED" ? "bg-blue-100 text-blue-800" :
                      order.status === "PROCESSING" ? "bg-yellow-100 text-yellow-800" :
                      order.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">
                        {order.user.name || order.user.email}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${Number(order.total).toLocaleString("es-AR")}</p>
                      <p className="text-muted-foreground">{order.paymentStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
