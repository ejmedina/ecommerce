import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { UpdateOrderStatus } from "./update-order-status"

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: {
        include: {
          product: true
        }
      },
    },
  })

  if (!order) {
    notFound()
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
      PENDING: "warning",
      PAID: "success",
      PROCESSING: "default",
      SHIPPED: "secondary",
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

  function getPaymentBadge(status: string) {
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      PENDING: "warning",
      APPROVED: "success",
      REJECTED: "destructive",
      REFUNDED: "destructive",
      CANCELLED: "destructive",
    }
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      APPROVED: "Aprobado",
      REJECTED: "Rechazado",
      REFUNDED: "Reembolsado",
      CANCELLED: "Cancelado",
    }
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
  }

  const shippingAddress = order.shippingAddress as any
  const billingAddress = order.billingAddress as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Pedido #{order.orderNumber}</h1>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(order.status)}
          <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div className="grid gap-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <span>Creado: {formatDateTime(order.createdAt)}</span>
          {order.paidAt && <span>Pagado: {formatDateTime(order.paidAt)}</span>}
          {order.shippedAt && <span>Enviado: {formatDateTime(order.shippedAt)}</span>}
          {order.deliveredAt && <span>Entregado: {formatDateTime(order.deliveredAt)}</span>}
          {order.cancelledAt && <span>Cancelado: {formatDateTime(order.cancelledAt)}</span>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Nombre:</strong> {order.user.name || "No especificado"}</p>
            <p><strong>Email:</strong> {order.user.email}</p>
            <p><strong>Teléfono:</strong> {order.user.phone || "No especificado"}</p>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.shippingMethod === "pickup" ? (
              <p className="font-medium">Retiro en tienda</p>
            ) : (
              <>
                <p><strong>Dirección:</strong> {shippingAddress?.street} {shippingAddress?.number}</p>
                {shippingAddress?.floor && <p>Piso: {shippingAddress.floor}</p>}
                {shippingAddress?.apartment && <p>Depto: {shippingAddress.apartment}</p>}
                <p>{shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postalCode}</p>
                <p><strong>País:</strong> {shippingAddress?.country || "Argentina"}</p>
              </>
            )}
            {shippingAddress?.instructions && (
              <p className="text-muted-foreground"><strong>Instrucciones:</strong> {shippingAddress.instructions}</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Método de pago:</strong> {
              order.paymentMethod === "MERCADOPAGO" ? "Mercado Pago" :
              order.paymentMethod === "BANK_TRANSFER" ? "Transferencia bancaria" :
              order.paymentMethod === "CASH_ON_DELIVERY" ? "Efectivo contra entrega" :
              order.paymentMethod
            }</div>
            <div className="flex items-center gap-2"><strong>Estado del pago:</strong> {getPaymentBadge(order.paymentStatus)}</div>
            {order.mercadopagoId && (
              <p className="text-sm text-muted-foreground"><strong>MP ID:</strong> {order.mercadopagoId}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(order.customerNotes || order.adminNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.customerNotes && (
              <div>
                <p className="font-medium text-sm">Notas del cliente:</p>
                <p className="text-muted-foreground">{order.customerNotes}</p>
              </div>
            )}
            {order.adminNotes && (
              <div>
                <p className="font-medium text-sm">Notas del admin:</p>
                <p className="text-muted-foreground">{order.adminNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Cantidad: {item.quantity} {item.sku && `• SKU: ${item.sku}`}
                  </p>
                </div>
                <p className="font-medium">{formatCurrency(Number(item.total))}</p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío</span>
              <span>{Number(order.shippingCost) === 0 ? "Gratis" : formatCurrency(Number(order.shippingCost))}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>-{formatCurrency(Number(order.discountAmount))}</span>
              </div>
            )}
            {Number(order.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span>{formatCurrency(Number(order.taxAmount))}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
        </CardContent>
      </Card>

      {/* MercadoPago Data (if available) */}
      {order.mercadopagoData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos de MercadoPago</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
              {JSON.stringify(order.mercadopagoData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
