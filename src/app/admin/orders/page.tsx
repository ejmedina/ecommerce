import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { OrdersTable } from "./orders-table"
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"

interface Props {
  searchParams: Promise<{
    page?: string
    status?: string
    paymentStatus?: string
    paymentMethod?: string
    fromDate?: string
    toDate?: string
    userId?: string
  }>
}

const ORDERS_PER_PAGE = 20

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams
  
  // Obtener sesión del usuario
  const session = await auth()
  const userRole = session?.user?.role
  
  // Verificar si el usuario tiene permisos de admin
  const isAdmin = userRole && ["SUPERADMIN", "OWNER", "ADMIN"].includes(userRole)

  // Construir filtros
  const where: Prisma.OrderWhereInput = {}

  if (params.userId) {
    where.userId = params.userId
  }
  
  // Filtro por estado de pedido
  if (params.status && params.status !== "all") {
    where.orderStatus = params.status as OrderStatus
  }
  
  // Filtro por estado de pago
  if (params.paymentStatus && params.paymentStatus !== "all") {
    where.paymentStatus = params.paymentStatus as PaymentStatus
  }
  
  // Filtro por método de pago
  if (params.paymentMethod && params.paymentMethod !== "all") {
    where.paymentMethod = params.paymentMethod as PaymentMethod
  }
  
  // Filtro por fecha (desde)
  if (params.fromDate) {
    where.createdAt = {
      ...where.createdAt,
      gte: new Date(params.fromDate),
    }
  }
  
  // Filtro por fecha (hasta)
  if (params.toDate) {
    where.createdAt = {
      ...where.createdAt,
      lte: new Date(params.toDate + "T23:59:59"),
    }
  }

  // Obtener total de pedidos (para paginado)
  const totalOrders = await db.order.count({ where })
  
  // Calcular paginado
  const page = parseInt(params.page || "1")
  const skip = (page - 1) * ORDERS_PER_PAGE
  
  // Obtener pedidos con filtros y paginado
  const orders = await db.order.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: ORDERS_PER_PAGE,
  })

  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE)

  // Convertir a tipos primitivos para pasar al componente cliente
  const ordersData = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    total: Number(order.total),
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    user: {
      name: order.user.name,
      email: order.user.email,
    },
    shippingMethod: order.shippingMethod,
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      quantity: item.quantityOrdered,
    })),
  }))

  // Obtener pedidos válidos para crear hoja de ruta
  // Para pago contra entrega: cualquier pedido confirmado
  // Para pago prepago: pedido con paymentStatus = PAID
  const validOrdersForRouteSheet = orders
    .filter((order) => {
      if (!isRouteEligibleOrder(order)) return false

      // Para pago contra entrega: CONFIRMED o posterior
      const isCashOnDelivery = ["CASH_ON_DELIVERY", "CARD_ON_DELIVERY", "TRANSFER_ON_DELIVERY"].includes(order.paymentMethod)
      if (isCashOnDelivery) {
        return ["CONFIRMED", "PREPARING", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].includes(order.orderStatus)
      }
      // Para pago prepago: necesita estar pagado
      return order.paymentStatus === "PAID"
    })
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

      <OrdersTable 
        orders={ordersData} 
        validOrdersForRouteSheet={validOrdersForRouteSheet} 
        isAdmin={isAdmin}
        currentPage={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        currentFilters={{
          status: params.status || "",
          paymentStatus: params.paymentStatus || "",
          paymentMethod: params.paymentMethod || "",
          fromDate: params.fromDate || "",
          toDate: params.toDate || "",
          userId: params.userId || "",
        }}
      />
    </div>
  )
}

function hasDeliveryAddress(shippingAddress: unknown) {
  if (!shippingAddress || typeof shippingAddress !== "object" || Array.isArray(shippingAddress)) return false

  const address = shippingAddress as Record<string, unknown>
  return Boolean(address.street && address.number && address.city)
}

function isRouteEligibleOrder(order: {
  shippingMethod: string
  shippingAddress: unknown
}) {
  return order.shippingMethod !== "pickup" && hasDeliveryAddress(order.shippingAddress)
}
