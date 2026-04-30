import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ order?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams
  const orderId = params.order
  const session = await auth()
  const isLoggedIn = !!session?.user

  let order = null
  if (orderId) {
    order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
  }

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold mb-4">¡Pedido confirmado!</h1>
        
        {order ? (
          <>
            <p className="text-muted-foreground mb-6">
              Tu pedido <strong>#{order.orderNumber}</strong> fue recibido exitosamente.
            </p>
            
            <div className="bg-muted rounded-lg p-4 mb-6 text-left">
              <p className="text-sm mb-2">
                <strong>Total:</strong> {formatCurrency(Number(order.total))}
              </p>
              <p className="text-sm mb-2">
                <strong>Método de pago:</strong> {
                  order.paymentMethod === "MERCADOPAGO" ? "Mercado Pago" :
                  order.paymentMethod === "BANK_TRANSFER" ? "Transferencia bancaria" :
                  "Efectivo al retirar"
                }
              </p>
              <p className="text-sm">
                <strong>Estado:</strong> {
                  order.paymentStatus === "APPROVED" ? "Pagado" :
                  order.paymentStatus === "PENDING" ? "Pendiente de pago" :
                  order.paymentStatus
                }
              </p>
            </div>

            {order.paymentMethod === "BANK_TRANSFER" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left text-sm">
                <p className="font-medium text-yellow-800 mb-2">Información para la transferencia:</p>
                <p className="text-yellow-700">Te enviamos los datos por email. Una vez acreditada la transferencia, confirmaremos tu pedido.</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground mb-6">
            Recibiste un email con los detalles de tu pedido.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {isLoggedIn ? (
            <Button asChild>
              <Link href="/account/orders">Ver mis pedidos</Link>
            </Button>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm text-blue-800">
              <p className="font-medium mb-1">¿Querés seguir el estado de tu pedido?</p>
              <p>Revisá tu correo electrónico. Te enviamos un enlace para que puedas establecer una contraseña y acceder a tu cuenta.</p>
            </div>
          )}
          <Button variant="outline" asChild>
            <Link href="/products">Seguir comprando</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
