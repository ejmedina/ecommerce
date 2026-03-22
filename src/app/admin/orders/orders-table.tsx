"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createRouteSheet } from "@/lib/actions/route-sheet-actions"
import { updateOrdersStatus } from "@/lib/actions/order-actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  isAdmin?: boolean
  currentPage: number
  totalPages: number
  totalOrders: number
  currentFilters: {
    status: string
    paymentStatus: string
    paymentMethod: string
    fromDate: string
    toDate: string
  }
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

export function OrdersTable({ 
  orders, 
  validOrdersForRouteSheet, 
  isAdmin,
  currentPage,
  totalPages,
  totalOrders,
  currentFilters 
}: OrdersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Estado para filtros
  const [filters, setFilters] = useState(currentFilters)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [estimateStockOpen, setEstimateStockOpen] = useState(false)
  const [routeName, setRouteName] = useState(`Ruta ${new Date().toLocaleDateString("es-AR")}`)
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Construir URL con filtros
  const buildUrl = (newFilters: typeof filters, newPage?: number) => {
    const params = new URLSearchParams()
    if (newFilters.status) params.set("status", newFilters.status)
    if (newFilters.paymentStatus) params.set("paymentStatus", newFilters.paymentStatus)
    if (newFilters.paymentMethod) params.set("paymentMethod", newFilters.paymentMethod)
    if (newFilters.fromDate) params.set("fromDate", newFilters.fromDate)
    if (newFilters.toDate) params.set("toDate", newFilters.toDate)
    if (newPage && newPage > 1) params.set("page", String(newPage))
    const queryString = params.toString()
    return queryString ? `/admin/orders?${queryString}` : "/admin/orders"
  }

  // Aplicar filtros
  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters)
    router.push(buildUrl(newFilters, 1))
  }

  // Cambiar página
  const goToPage = (page: number) => {
    router.push(buildUrl(filters, page))
  }

  // Toggle orden
  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  // Toggle todos
  const toggleAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)))
    }
  }

  // Crear hoja de ruta
  const handleCreateRouteSheet = async () => {
    if (selectedOrders.size === 0) return
    setIsLoading(true)
    setError(null)
    
    const result = await createRouteSheet(
      routeName,
      Array.from(selectedOrders),
      new Date(routeDate)
    )
    
    setIsLoading(false)
    
    if (result.error === "AUTH_REQUIRED") {
      const pendingAction = {
        action: "createRouteSheet",
        routeName,
        orderIds: Array.from(selectedOrders),
        routeDate,
      }
      sessionStorage.setItem("pendingAction", JSON.stringify(pendingAction))
      router.push(`/login?returnUrl=/admin/orders`)
      return
    }
    
    if (result.error === "UNAUTHORIZED") {
      router.push("/")
      return
    }
    
    if (result.error) {
      setError(result.error)
      return
    }
    
    if (result.routeSheet) {
      setCreateDialogOpen(false)
      setSelectedOrders(new Set())
      router.push(`/admin/routes/${result.routeSheet.id}`)
    }
  }

  // Acción masiva - Confirmar
  const handleConfirmOrders = async () => {
    if (selectedOrders.size === 0) return
    setIsLoading(true)
    const result = await updateOrdersStatus(
      Array.from(selectedOrders),
      "CONFIRMED"
    )
    setIsLoading(false)
    if (result.success) {
      setSelectedOrders(new Set())
      router.refresh()
    }
  }

  // Acción masiva - Cancelar
  const handleCancelOrders = async () => {
    if (selectedOrders.size === 0) return
    setIsLoading(true)
    const result = await updateOrdersStatus(
      Array.from(selectedOrders),
      "CANCELLED"
    )
    setIsLoading(false)
    if (result.success) {
      setSelectedOrders(new Set())
      router.refresh()
    }
  }

  // Calcular stock
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
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Estado de pedido */}
            <div>
              <Label className="text-xs">Estado</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => applyFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="RECEIVED">Recibido</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                  <SelectItem value="PREPARING">Preparando</SelectItem>
                  <SelectItem value="READY_FOR_DELIVERY">Listo</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">En reparto</SelectItem>
                  <SelectItem value="DELIVERED">Entregado</SelectItem>
                  <SelectItem value="NOT_DELIVERED">No entregado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado de pago */}
            <div>
              <Label className="text-xs">Estado de pago</Label>
              <Select 
                value={filters.paymentStatus} 
                onValueChange={(value) => applyFilters({ ...filters, paymentStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="AUTHORIZED">Autorizado</SelectItem>
                  <SelectItem value="PAID">Pagado</SelectItem>
                  <SelectItem value="FAILED">Fallido</SelectItem>
                  <SelectItem value="REFUNDED">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div>
              <Label className="text-xs">Medio de pago</Label>
              <Select 
                value={filters.paymentMethod} 
                onValueChange={(value) => applyFilters({ ...filters, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ONLINE_CARD">Tarjeta online</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="DIGITAL_WALLET">Wallet</SelectItem>
                  <SelectItem value="CASH_ON_DELIVERY">Contra entrega</SelectItem>
                  <SelectItem value="CARD_ON_DELIVERY">Tarjeta entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha desde */}
            <div>
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => applyFilters({ ...filters, fromDate: e.target.value })}
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => applyFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar de selección */}
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
                  Seleccionar ({selectedOrders.size} de {orders.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Acciones masivas */}
                {selectedOrders.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isLoading}>
                        Acciones ({selectedOrders.size}) ▼
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleConfirmOrders}>
                        ✅ Confirmar pedidos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCancelOrders} className="text-red-600">
                        ❌ Cancelar pedidos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Estimar Stock */}
                <Dialog open={estimateStockOpen} onOpenChange={setEstimateStockOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled={selectedOrders.size === 0}
                    >
                      📦 Stock ({selectedOrders.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Stock Estimado</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                        {estimatedStock.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No hay productos</p>
                        ) : (
                          <ul className="space-y-2">
                            {estimatedStock.map((item, index) => (
                              <li key={index} className="flex justify-between">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-bold">{item.quantity}</span>
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
                        📋 Copiar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Crear Hoja de Ruta */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={selectedOrders.size === 0}>
                      📋 Ruta ({selectedOrders.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Hoja de Ruta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={routeName}
                          onChange={(e) => setRouteName(e.target.value)}
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
                      <p className="text-sm text-muted-foreground">
                        {selectedOrders.size} pedidos seleccionados
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateRouteSheet} disabled={isLoading}>
                        Crear
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay pedidos con los filtros seleccionados.
          </CardContent>
        </Card>
      ) : (
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
                    <span className={`px-2 py-1 rounded text-xs font-medium ${orderStatusColors[order.orderStatus] || "bg-gray-100 text-gray-800"}`}>
                      {orderStatusLabels[order.orderStatus] || order.orderStatus}
                    </span>
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Paginado */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {orders.length} de {totalOrders} pedidos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
