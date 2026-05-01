import Link from "next/link"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, DollarSign } from "lucide-react"
import { SalesComparisonChart } from "@/components/admin/sales-comparison"

function buildCumulativeSeries(values: number[], visibleDays?: number) {
  let runningTotal = 0

  return values.map((value, index) => {
    if (visibleDays && index + 1 > visibleDays) {
      return null
    }

    runningTotal += value
    return runningTotal
  })
}

export default async function DashboardPage() {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]
  const currentMonthName = monthNames[now.getMonth()]
  const lastMonthName = monthNames[(now.getMonth() + 11) % 12]

  // Day of month (1-31)
  const currentDay = now.getDate()

  const salesEligibleWhere: Prisma.OrderWhereInput = {
    OR: [
      {
        paymentStatus: {
          in: ["PAID", "AUTHORIZED"],
        },
      },
      {
        paymentMethod: {
          in: ["CASH_ON_DELIVERY", "CARD_ON_DELIVERY", "TRANSFER_ON_DELIVERY"],
        },
        orderStatus: {
          in: ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY", "DELIVERED"],
        },
      },
    ],
  }

  // Get stats
  const [productCount, orderCount, customerCount, totalSales, currentMonthSales, lastMonthSales] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.order.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.aggregate({
      _sum: { total: true },
      where: salesEligibleWhere,
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        ...salesEligibleWhere,
        createdAt: { gte: currentMonthStart },
      },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        ...salesEligibleWhere,
        createdAt: { gte: lastMonthStart, lt: currentMonthStart },
      },
    }),
  ])

  // Get daily cumulative for chart
  const currentOrders = await db.order.findMany({
    where: { 
      ...salesEligibleWhere,
      createdAt: { gte: currentMonthStart },
    },
    select: { createdAt: true, total: true }
  })

  const lastOrders = await db.order.findMany({
    where: { 
      ...salesEligibleWhere,
      createdAt: { gte: lastMonthStart, lt: currentMonthStart },
    },
    select: { createdAt: true, total: true }
  })

  // Process cumulative data
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const currentMonthDaily = new Array(daysInMonth).fill(0)
  const lastMonthDaily = new Array(daysInMonth).fill(0)

  currentOrders.forEach(o => {
    const day = o.createdAt.getDate() - 1
    if (day < daysInMonth) currentMonthDaily[day] += Number(o.total)
  })

  lastOrders.forEach(o => {
    const day = o.createdAt.getDate() - 1
    if (day < daysInMonth) lastMonthDaily[day] += Number(o.total)
  })

  // Cumulative
  const currentCumulative = buildCumulativeSeries(currentMonthDaily, currentDay)
  const lastCumulative = buildCumulativeSeries(lastMonthDaily)

  // Compare sums for card labels
  const currentSalesTotal = Number(currentMonthSales._sum?.total || 0)
  const lastSalesTotal = Number(lastMonthSales._sum?.total || 0)
  const isSalesUp = currentSalesTotal >= lastSalesTotal
  const monthSalesDiff = lastSalesTotal > 0 ? ((currentSalesTotal - lastSalesTotal) / lastSalesTotal) * 100 : 0

  // Ticket promedio
  const currentOrderCount = currentOrders.length
  const lastOrderCount = lastOrders.length
  const currentAvgTicket = currentOrderCount > 0 ? currentSalesTotal / currentOrderCount : 0
  const lastAvgTicket = lastOrderCount > 0 ? lastSalesTotal / lastOrderCount : 0
  const isAvgTicketUp = currentAvgTicket >= lastAvgTicket
  const avgTicketDiff = lastAvgTicket > 0 ? ((currentAvgTicket - lastAvgTicket) / lastAvgTicket) * 100 : 0

  // Get recent orders
  const recentOrders = await db.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  })

  // Status labels
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas {currentMonthName}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentSalesTotal.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
              })}
            </div>
            <p className={`text-xs ${isSalesUp ? "text-green-600" : "text-orange-600"} mt-1`}>
              {isSalesUp ? "↑" : "↓"} {Math.abs(monthSalesDiff).toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentAvgTicket.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
              })}
            </div>
            <p className={`text-xs ${isAvgTicketUp ? "text-green-600" : "text-orange-600"} mt-1`}>
              {isAvgTicketUp ? "↑" : "↓"} {Math.abs(avgTicketDiff).toFixed(1)}% vs mes anterior ({lastAvgTicket.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 })})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas {lastMonthName}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastSalesTotal.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cierre de mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Históricas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(totalSales._sum?.total || 0).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de la plataforma</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Sales Comparison Chart */}
        <SalesComparisonChart
          currentMonthName={currentMonthName}
          lastMonthName={lastMonthName}
          currentCumulative={currentCumulative}
          lastCumulative={lastCumulative}
        />
      </div>

      {/* Recent Orders and Stats row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumen de Catálogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Productos Activos</span>
              <span className="font-bold">{productCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pedidos Totales</span>
              <span className="font-bold">{orderCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Clientes Totales</span>
              <span className="font-bold">{customerCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pedidos Recientes</CardTitle>
            <Link href="/admin/orders" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground">No hay pedidos todavía</p>
            ) : (
              <div className="space-y-1">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold text-sm tracking-tight">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.user.name || order.user.email} - {new Date(order.createdAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-bold text-sm">
                          {Number(order.total).toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            minimumFractionDigits: 0,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">{orderStatusLabels[order.orderStatus] || order.orderStatus}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
