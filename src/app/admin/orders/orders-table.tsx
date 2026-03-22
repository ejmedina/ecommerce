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

interface OrdersTableProps {
  orders: {
    id: string
    orderNumber: string
    status: string
    total: number
    paymentStatus: string
    paymentMethod: string
    createdAt: string
    user: {
      name: string | null
      email: string
    }
  }[]
  validOrdersForRouteSheet: {
    id: string
    orderNumber: string
  }[]
}

export function OrdersTable({ orders, validOrdersForRouteSheet }: OrdersTableProps) {
  const router = useRouter()
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
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
    
    // La función ahora obtiene el usuario de la sesión automáticamente
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

  return (
    <>
      {/* Selection toolbar - mostrar para todos los pedidos */}
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
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.status === "DELIVERED" ? "bg-green-100 text-green-800" :
                      order.status === "SHIPPED" ? "bg-blue-100 text-blue-800" :
                      order.status === "PROCESSING" ? "bg-yellow-100 text-yellow-800" :
                      order.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                      order.status === "PAID" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {order.status === "PAID" ? "Pagado" :
                       order.status === "PROCESSING" ? "Procesando" :
                       order.status === "SHIPPED" ? "Enviado" :
                       order.status === "DELIVERED" ? "Entregado" :
                       order.status === "CANCELLED" ? "Cancelado" :
                       order.status === "PENDING" ? "Pendiente" :
                       order.status}
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
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        order.paymentStatus === "APPROVED" ? "bg-green-100 text-green-700" :
                        order.paymentStatus === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {order.paymentStatus === "APPROVED" ? "✓ Pagado" :
                         order.paymentStatus === "PENDING" ? "⏳ Pendiente" :
                         order.paymentStatus}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.paymentMethod === "MERCADOPAGO" ? "MP" :
                         order.paymentMethod === "BANK_TRANSFER" ? "Transferencia" :
                         order.paymentMethod === "CASH_ON_DELIVERY" ? "Efectivo" :
                         order.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>
                {!isSelected && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    💡 Click en el checkbox para agregar a hoja de ruta
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
