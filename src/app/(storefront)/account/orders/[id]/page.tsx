import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  })

  if (!order || order.userId !== session.user.id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-6">Pedido no encontrado</p>
        <Button asChild>
          <Link href="/account/orders">Volver a mis pedidos</Link>
        </Button>
      </div>
    )
  }

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

  const shippingAddress = order.shippingAddress as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
            ← Volver a mis pedidos
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Pedido #{order.orderNumber}</h1>
        </div>
        {getStatusBadge(order.status)}
      </div>

      <div className="text-sm text-muted-foreground">
        Fecha del pedido: {formatDate(order.createdAt)}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
            <p><strong>Método de pago:</strong> {
              order.paymentMethod === "MERCADOPAGO" ? "Mercado Pago" :
              order.paymentMethod === "BANK_TRANSFER" ? "Transferencia bancaria" :
              "Efectivo"
            }</p>
            <p><strong>Estado:</strong> {getStatusBadge(order.paymentStatus)}</p>
          </CardContent>
        </Card>
      </div>

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
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
