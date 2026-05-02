import Link from "next/link"
import { MapPin } from "lucide-react"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { OrderStatusManager } from "@/components/order-status-manager"
import { OrderFulfillment } from "@/components/order-fulfillment"

import { Button } from "@/components/ui/button"
import { UpdateCoordinatesDialog } from "@/components/logistics/update-coordinates-dialog"

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

  function getOrderStatusBadge(status: string) {
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      RECEIVED: "default",
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

  function getPaymentStatusBadge(status: string) {
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      PENDING: "warning",
      AUTHORIZED: "default",
      PAID: "success",
      PARTIALLY_REFUNDED: "warning",
      REFUNDED: "destructive",
      FAILED: "destructive",
      VOIDED: "default",
    }
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      AUTHORIZED: "Autorizado",
      PAID: "Pagado",
      PARTIALLY_REFUNDED: "Reembolso parcial",
      REFUNDED: "Reembolsado",
      FAILED: "Fallido",
      VOIDED: "Anulado",
    }
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
  }

  function getPaymentMethodLabel(method: string) {
    const labels: Record<string, string> = {
      ONLINE_CARD: "Tarjeta online",
      BANK_TRANSFER: "Transferencia",
      DIGITAL_WALLET: "Wallet digital",
      CASH_ON_DELIVERY: "Efectivo al entregar",
      CARD_ON_DELIVERY: "Tarjeta al entregar",
      TRANSFER_ON_DELIVERY: "Transferencia al entregar",
    }
    return labels[method] || method
  }

  const shippingAddress = order.shippingAddress as any
  const subtotal = Number(order.subtotal)
  const shippingCost = Number(order.shippingCost)
  const discountAmount = Number(order.discountAmount)
  const taxAmount = Number(order.taxAmount)
  const fulfilledSubtotal = order.fulfilledTotal !== null ? Number(order.fulfilledTotal) : null
  const hasPreparedAdjustment = fulfilledSubtotal !== null && fulfilledSubtotal !== subtotal
  const fulfilledTotalToCollect = fulfilledSubtotal !== null
    ? fulfilledSubtotal + shippingCost + taxAmount - discountAmount
    : null

  // Check for partial fulfillment (faltantes)
  const hasFaltantes = order.items.some(
    item => item.fulfilledAt && (item.quantityFulfilled ?? item.quantityOrdered) !== item.quantityOrdered
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Pedido #{order.orderNumber}</h1>
        </div>
        
        {/* Simplified 2-axis status manager */}
        <OrderStatusManager
          orderId={order.id}
          orderStatus={order.orderStatus}
          paymentStatus={order.paymentStatus}
          paymentMethod={order.paymentMethod}
        />
      </div>

      {/* Status summary cards - 2 axes only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getOrderStatusBadge(order.orderStatus)}
              {order.orderStatus === "PREPARING" && hasFaltantes && (
                <span className="text-xs text-orange-600">⚠️ Con faltantes</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado del Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getPaymentStatusBadge(order.paymentStatus)}
              <span className="text-xs text-muted-foreground">{getPaymentMethodLabel(order.paymentMethod)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <span>Creado: {formatDateTime(order.createdAt)}</span>
          {order.paidAt && <span>Pagado: {formatDateTime(order.paidAt)}</span>}
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
                <div className="mt-2 space-y-2">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}, ${shippingAddress?.state}, Argentina`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      Ver en mapa
                    </Button>
                  </a>
                  <UpdateCoordinatesDialog 
                    orderId={order.id} 
                    currentLat={shippingAddress?.lat} 
                    currentLng={shippingAddress?.lng} 
                  />
                </div>
                <p><strong>País:</strong> {shippingAddress?.country || "Argentina"}</p>
                {shippingAddress?.lat && shippingAddress?.lng && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Coordenadas: {shippingAddress.lat}, {shippingAddress.lng}
                  </p>
                )}
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
            <div><strong>Método de pago:</strong> {getPaymentMethodLabel(order.paymentMethod)}</div>
            <div className="flex items-center gap-2"><strong>Estado:</strong> {getPaymentStatusBadge(order.paymentStatus)}</div>
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

      {/* Fulfillment Management Section */}
      <OrderFulfillment 
        orderId={order.id} 
        items={order.items as any}
        currentStatus={order.orderStatus}
      />

      {/* Items with faltantes info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => {
              const quantityOrdered = item.quantityOrdered
              const quantityFulfilled = item.fulfilledAt ? item.quantityFulfilled ?? quantityOrdered : quantityOrdered
              const hasFaltante = quantityFulfilled < quantityOrdered
              
              return (
                <div key={item.id} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.sku && `SKU: ${item.sku}`}
                    </p>
                    {/* Faltante info */}
                    {hasFaltante && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm">
                          <span className="text-orange-600 font-medium">{quantityFulfilled}</span>
                          <span className="text-muted-foreground"> / {quantityOrdered}</span>
                        </span>
                        <Badge variant="warning" className="text-xs">Faltante</Badge>
                        {item.missingReason && (
                          <span className="text-xs text-muted-foreground">({item.missingReason})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(Number(item.unitTotal))}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {hasPreparedAdjustment && fulfilledSubtotal !== null && (
              <div className="flex justify-between text-orange-600">
                <span>Total preparado</span>
                <span>{formatCurrency(fulfilledSubtotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Envío</span>
              <span>{shippingCost === 0 ? "Gratis" : formatCurrency(shippingCost)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
          {hasPreparedAdjustment && fulfilledTotalToCollect !== null && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Total a cobrar:</span>
              <span className="font-medium">{formatCurrency(fulfilledTotalToCollect)}</span>
            </div>
          )}
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
