import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { OrdersTable } from "./orders-table"

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Convertir a tipos primitivos para pasar al componente cliente
  const ordersData = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    user: {
      name: order.user.name,
      email: order.user.email,
    },
  }))

  // Obtener pedidos válidos para crear hoja de ruta (cualquier pedido pagado)
  const validOrdersForRouteSheet = orders
    .filter((order) => order.paymentStatus === "APPROVED")
    .map((order) => ({ id: order.id, orderNumber: order.orderNumber }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Link href="/admin/routes">
          <Card className="hover:bg-muted/50 cursor-pointer">
            <CardContent className="py-2 px-4">
              <span className="text-sm">Ver Hojas de Ruta →</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay pedidos todavía.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Info about valid orders for route sheet */}
          {validOrdersForRouteSheet.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-3">
                <p className="text-sm text-blue-800">
                  💡 Hay <strong>{validOrdersForRouteSheet.length}</strong> pedidos listos para preparar/repartir.
                  Selecciona los pedidos y crea una hoja de ruta.
                </p>
              </CardContent>
            </Card>
          )}

          <OrdersTable orders={ordersData} validOrdersForRouteSheet={validOrdersForRouteSheet} />
        </>
      )}
    </div>
  )
}
