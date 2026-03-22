"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, Loader2, Package, Truck, Check, XCircle, CreditCard, Clock } from "lucide-react"

// === ORDER STATUS OPTIONS ===
const orderStatusOptions = [
  { value: "RECEIVED", label: "Recibido", icon: Package },
  { value: "CONFIRMED", label: "Confirmado", icon: Check },
  { value: "PREPARING", label: "En preparación", icon: Package },
  { value: "READY_FOR_DELIVERY", label: "Listo para entregar", icon: Truck },
  { value: "OUT_FOR_DELIVERY", label: "En reparto", icon: Truck },
  { value: "DELIVERED", label: "Entregado", icon: Check },
  { value: "NOT_DELIVERED", label: "No entregado", icon: XCircle },
  { value: "CANCELLED", label: "Cancelado", icon: XCircle },
]

// === PAYMENT STATUS OPTIONS ===
const paymentStatusOptions = [
  { value: "PENDING", label: "Pendiente", icon: Clock },
  { value: "AUTHORIZED", label: "Autorizado", icon: Check },
  { value: "PAID", label: "Pagado", icon: Check },
  { value: "PARTIALLY_REFUNDED", label: "Reembolso parcial", icon: Clock },
  { value: "REFUNDED", label: "Reembolsado", icon: XCircle },
  { value: "FAILED", label: "Fallido", icon: XCircle },
  { value: "VOIDED", label: "Anulado", icon: XCircle },
]

interface OrderStatusManagerProps {
  orderId: string
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
}

export function OrderStatusManager({
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: OrderStatusManagerProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [notDeliveredDialogOpen, setNotDeliveredDialogOpen] = useState(false)
  const [failureReason, setFailureReason] = useState("")

  const updateStatus = async (field: string, newValue: string) => {
    setIsLoading(true)
    setActiveMenu(null)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: newValue, failureReason: failureReason }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotDelivered = () => {
    setNotDeliveredDialogOpen(true)
  }

  const confirmNotDelivered = () => {
    updateStatus("orderStatus", "NOT_DELIVERED")
    setNotDeliveredDialogOpen(false)
    setFailureReason("")
  }

  const getStatusOption = (options: typeof orderStatusOptions, current: string) => {
    return options.find(opt => opt.value === current)
  }

  const getMethodLabel = (method: string) => {
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

  const currentOrderStatus = getStatusOption(orderStatusOptions, orderStatus)
  const currentPaymentStatus = getStatusOption(paymentStatusOptions, paymentStatus)

  const OrderStatusMenu = () => (
    <DropdownMenu open={activeMenu === "order"} onOpenChange={(open) => setActiveMenu(open ? "order" : null)}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading && activeMenu === "order" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Package className="h-4 w-4 mr-2" />
          )}
          {currentOrderStatus?.label || orderStatus}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Estado del Pedido</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orderStatusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              if (option.value === "NOT_DELIVERED") {
                setActiveMenu(null)
                handleNotDelivered()
              } else {
                updateStatus("orderStatus", option.value)
              }
            }}
            disabled={option.value === orderStatus}
            className={option.value === orderStatus ? "bg-muted" : ""}
          >
            <option.icon className="h-4 w-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const PaymentStatusMenu = () => (
    <DropdownMenu open={activeMenu === "payment"} onOpenChange={(open) => setActiveMenu(open ? "payment" : null)}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading && activeMenu === "payment" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CreditCard className="h-4 w-4 mr-2" />
          )}
          {currentPaymentStatus?.label || paymentStatus}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Estado del Pago</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {paymentStatusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => updateStatus("paymentStatus", option.value)}
            disabled={option.value === paymentStatus}
            className={option.value === paymentStatus ? "bg-muted" : ""}
          >
            <option.icon className="h-4 w-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        <OrderStatusMenu />
        <PaymentStatusMenu />
        
        {/* Payment Method indicator */}
        <span className="text-xs text-muted-foreground ml-2">
          {getMethodLabel(paymentMethod)}
        </span>
      </div>

      {/* Dialog para marcar como no entregado */}
      <Dialog open={notDeliveredDialogOpen} onOpenChange={setNotDeliveredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como No Entregado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Ej: Cliente no estaba en su domicilio..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotDeliveredDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmNotDelivered}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
