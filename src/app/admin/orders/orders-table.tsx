"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createRouteSheet } from "@/lib/actions/route-sheet-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface OrderItem {
  id: string
  productId: string
  name: string
  quantity: number
}

interface Order {
  id: string
  orderNumber: string
  orderStatus: string
  fulfillmentStatus: string
  total: number
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  user: {
    name: string | null
    email: string
  }
  items: OrderItem[]
}

interface OrdersTableProps {
  orders: Order[]
  validOrdersForRouteSheet: {
    id: string
    orderNumber: string
  }[]
}

// Labels para OrderStatus
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

const orderStatusColors: Record<string, string> = {
  RECEIVED: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-yellow-100 text-yellow-800",
  READY_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  NOT_DELIVERED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-600",
}

// Labels para PaymentStatus
const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  AUTHORIZED: "Autorizado",
  PAID: "Pagado",
  PARTIALLY_REFUNDED: "Reemb. parcial",
  REFUNDED: "Reembolsado",
  FAILED: "Fallido",
  VOIDED: "Anulado",
}

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  AUTHORIZED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  REFUNDED: "bg-purple-100 text-purple-700",
  FAILED: "bg-red-100 text-red-700",
  VOIDED: "bg-gray-100 text-gray-600",
}

// Labels para PaymentMethod
const paymentMethodLabels: Record<string, string> = {
  ONLINE_CARD: "Tarjeta online",
  BANK_TRANSFER: "Transferencia",
  DIGITAL_WALLET: "Wallet",
  CASH_ON_DELIVERY: "Contra entrega",
  CARD_ON_DELIVERY: "Tarjeta entrega",
  TRANSFER_ON_DELIVERY: "Transf. entrega",
}

export function OrdersTable({ orders, validOrdersForRouteSheet }: OrdersTableProps) {
  const router = useRouter()
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [estimateStockOpen, setEstimateStockOpen] = useState(false)
  const [routeName, setRouteName] = useState(`Ruta ${new Date().toLocaleDateString("es-AR")}`)
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)

  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const toggleAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)))
    }
  }

  const handleCreateRouteSheet = async () => {
    if (selectedOrders.size === 0) return
    setIsLoading(true)
    
    const result = await createRouteSheet(
      routeName,
      Array.from(selectedOrders),
      new Date(routeDate)
    )
    
    setIsLoading(false)
    if (result.routeSheet) {
      setCreateDialogOpen(false)
      setSelectedOrders(new Set())
      router.push(`/admin/routes/${result.routeSheet.id}`)
    }
  }

  // Calcular stock totalizado de los pedidos seleccionados
  const calculateEstimatedStock = () => {
    const stockMap = new Map<string, { name: string; quantity: number }>()
    
    orders
      .filter((order) => selectedOrders.has(order.id))
      .forEach((order) => {
        order.items.forEach((item) => {
          const existing = stockMap.get(item.productId)
          if (existing) {
            existing.quantity += item.quantity
          } else {
            stockMap.set(item.productId, { name: item.name, quantity: item.quantity })
          }
        })
      })
    
    return Array.from(stockMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const estimatedStock = calculateEstimatedStock()

  const generateStockText = () => {
    return estimatedStock
      .map((item) => `${item.name}: ${item.quantity} unidades`)
      .join("\n")
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateStockText())
    } catch (err) {
      console.error("Error al copiar:", err)
    }
  }

  return (
    <>
      {/* Selection toolbar */}
      {orders.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedOrders.size === orders.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm">
                  Seleccionar todos ({orders.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Botón Estimar Stock */}
                <Dialog open={estimateStockOpen} onOpenChange={setEstimateStockOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled={selectedOrders.size === 0}
                    >
                      📦 Estimar Stock ({selectedOrders.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Stock Estimado</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Cantidad total de productos en {selectedOrders.size} pedidos seleccionados:
                      </p>
                      <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                        {estimatedStock.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No hay productos en los pedidos seleccionados</p>
                        ) : (
                          <ul className="space-y-2">
                            {estimatedStock.map((item, index) => (
                              <li key={index} className="flex justify-between items-center">
                                <span className="font-medium">{item.name}</span>
                                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                                  {item.quantity} unidades
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEstimateStockOpen(false)}>
                        Cerrar
                      </Button>
                      <Button onClick={copyToClipboard} disabled={estimatedStock.length === 0}>
                        📋 Copiar al portapapeles
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Botón Crear Hoja de Ruta */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={selectedOrders.size === 0}>
                      Crear Hoja de Ruta ({selectedOrders.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Hoja de Ruta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nombre de la ruta</Label>
                        <Input
                          value={routeName}
                          onChange={(e) => setRouteName(e.target.value)}
                          placeholder="Ej: Ruta 22/03/2026 - Mañana"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input
                          type="date"
                          value={routeDate}
                          onChange={(e) => setRouteDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pedidos seleccionados</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedOrders.size} pedidos seleccionados
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateRouteSheet} disabled={isLoading}>
                        Crear Hoja de Ruta
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Orders list */}
      <div className="space-y-4">
        {orders.map((order) => {
          const isSelected = selectedOrders.has(order.id)

          return (
            <Card key={order.id} className={`
              hover:bg-muted/50 cursor-pointer transition-colors
              ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}
            `}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOrder(order.id)}
                    />
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${orderStatusColors[order.orderStatus] || "bg-gray-100 text-gray-800"}`}>
                      {orderStatusLabels[order.orderStatus] || order.orderStatus}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {order.user.name || order.user.email}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(order.total).toLocaleString("es-AR")}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-700"}`}>
                        {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>
                {!isSelected && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    💡 Click en el checkbox para seleccionar
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
