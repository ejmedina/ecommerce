"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useNavigationFeedback } from "@/components/navigation-feedback"
import { Printer } from "lucide-react"
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
  price: number
  unitTotal: number
}

interface Order {
  id: string
  orderNumber: string
  orderStatus: string
  total: number
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  user: {
    name: string | null
    email: string
    phone: string | null
  }
  shippingMethod: string
  shippingAddress: unknown
  customerNotes?: string | null
  items: OrderItem[]
}

interface OrdersTableProps {
  orders: Order[]
  validOrdersForRouteSheet: {
    id: string
    orderNumber: string
  }[]
  requiresPaymentToFulfill: boolean
  currentPage: number
  totalPages: number
  totalOrders: number
  currentFilters: {
    status: string
    paymentStatus: string
    paymentMethod: string
    fromDate: string
    toDate: string
    userId: string
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

type ShippingAddress = {
  street?: string
  number?: string
  floor?: string | null
  apartment?: string | null
  city?: string
  state?: string
  postalCode?: string
  instructions?: string | null
}

const cashOnDeliveryPaymentMethods = new Set([
  "CASH_ON_DELIVERY",
  "CARD_ON_DELIVERY",
  "TRANSFER_ON_DELIVERY",
])

function getShippingAddress(address: unknown): ShippingAddress | null {
  if (!address || typeof address !== "object" || Array.isArray(address)) return null
  return address as ShippingAddress
}

function formatShippingAddress(address: unknown) {
  const parsed = getShippingAddress(address)
  if (!parsed?.street || !parsed?.number || !parsed?.city) return null

  const streetLine = [
    `${parsed.street} ${parsed.number}`.trim(),
    parsed.floor ? `Piso ${parsed.floor}` : null,
    parsed.apartment ? `Depto ${parsed.apartment}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  const localityLine = [parsed.city, parsed.state, parsed.postalCode]
    .filter(Boolean)
    .join(", ")

  return {
    streetLine,
    localityLine,
    instructions: parsed.instructions,
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatOrderCurrency(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`
}

function getRouteIneligibilityReason(order: Order, requiresPaymentToFulfill: boolean) {
  if (order.shippingMethod === "pickup") {
    return "retiro en tienda"
  }

  if (!formatShippingAddress(order.shippingAddress)) {
    return "sin domicilio de entrega"
  }

  if (!requiresPaymentToFulfill) {
    return null
  }

  if (cashOnDeliveryPaymentMethods.has(order.paymentMethod)) {
    const allowedStatuses = new Set([
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_DELIVERY",
      "OUT_FOR_DELIVERY",
    ])

    if (!allowedStatuses.has(order.orderStatus)) {
      return "todavía no está confirmado para reparto"
    }

    return null
  }

  if (order.paymentStatus !== "PAID") {
    return "pago todavía no acreditado"
  }

  return null
}

export function OrdersTable({ 
  orders, 
  validOrdersForRouteSheet, 
  requiresPaymentToFulfill,
  currentPage,
  totalPages,
  totalOrders,
  currentFilters 
}: OrdersTableProps) {
  const router = useRouter()
  const { startNavigation } = useNavigationFeedback()
  
  // Estado para filtros
  const [filters, setFilters] = useState(currentFilters)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [estimateStockOpen, setEstimateStockOpen] = useState(false)
  const [routeName, setRouteName] = useState(`Ruta ${new Date().toLocaleDateString("es-AR")}`)
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const routeEligibleOrderIds = new Set(validOrdersForRouteSheet.map((order) => order.id))

  // Construir URL con filtros
  const buildUrl = (newFilters: typeof filters, newPage?: number) => {
    const params = new URLSearchParams()
    if (newFilters.status) params.set("status", newFilters.status)
    if (newFilters.paymentStatus) params.set("paymentStatus", newFilters.paymentStatus)
    if (newFilters.paymentMethod) params.set("paymentMethod", newFilters.paymentMethod)
    if (newFilters.fromDate) params.set("fromDate", newFilters.fromDate)
    if (newFilters.toDate) params.set("toDate", newFilters.toDate)
    if (newFilters.userId) params.set("userId", newFilters.userId)
    if (newPage && newPage > 1) params.set("page", String(newPage))
    const queryString = params.toString()
    return queryString ? `/admin/orders?${queryString}` : "/admin/orders"
  }

  // Aplicar filtros
  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters)
    startNavigation()
    router.push(buildUrl(newFilters, 1))
  }

  // Cambiar página
  const goToPage = (page: number) => {
    startNavigation()
    router.push(buildUrl(filters, page))
  }

  // Toggle orden
  const toggleOrder = (orderId: string) => {
    if (!routeEligibleOrderIds.has(orderId)) return

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
    const eligibleIds = orders.filter((order) => routeEligibleOrderIds.has(order.id)).map((order) => order.id)

    if (selectedOrders.size === eligibleIds.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(eligibleIds))
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const stockHtml = estimatedStock
      .map(item => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; text-align: left;">${item.name}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${item.quantity}</td>
        </tr>
      `)
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Estimación de Stock - ${new Date().toLocaleDateString('es-AR')}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            h1 { font-size: 20px; color: #333; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Estimación de Stock</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}</p>
          <p>Pedidos seleccionados: ${selectedOrders.size}</p>
          <table>
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${stockHtml}
            </tbody>
          </table>
          <div class="footer">
            Generado automáticamente el ${new Date().toLocaleString('es-AR')}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const address = formatShippingAddress(order.shippingAddress)
    const itemsList = order.items
      .map(
        (item) =>
          `<tr>
            <td>${item.quantity}x ${escapeHtml(item.name)}</td>
            <td class="num">${formatOrderCurrency(item.price)}</td>
            <td class="num"><strong>${formatOrderCurrency(item.unitTotal)}</strong></td>
          </tr>`
      )
      .join("")

    const notesHtml = order.customerNotes
      ? `<p><strong>Notas:</strong> ${escapeHtml(order.customerNotes)}</p>`
      : ""

    const instructionsHtml = address?.instructions
      ? `<p><strong>Indicaciones:</strong> ${escapeHtml(address.instructions)}</p>`
      : ""

    const shippingHtml =
      order.shippingMethod === "pickup"
        ? `<p><strong>Modalidad:</strong> Retiro en tienda</p>`
        : address
          ? `
            <p><strong>Modalidad:</strong> Envío a domicilio</p>
            <p><strong>Dirección:</strong> ${escapeHtml(address.streetLine)}</p>
            <p><strong>Localidad:</strong> ${escapeHtml(address.localityLine)}</p>
            ${instructionsHtml}
          `
          : `<p><strong>Modalidad:</strong> Envío a domicilio</p><p><strong>Dirección:</strong> Sin domicilio cargado</p>`

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(order.orderNumber)}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 24px; margin-bottom: 6px; }
            .meta { font-size: 14px; color: #555; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .sheet { border: 1px solid #000; padding: 16px; }
            .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 14px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 0; text-align: left; vertical-align: top; }
            th { font-size: 12px; color: #555; }
            .num { text-align: right; white-space: nowrap; }
            p { margin: 0 0 8px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Ficha de Pedido</h1>
          <div class="meta">
            Generado el ${new Date().toLocaleString("es-AR")}
          </div>
          <div class="sheet">
            <div class="header">
              <div>
                <p><strong>Pedido:</strong> ${escapeHtml(order.orderNumber)}</p>
                <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString("es-AR")}</p>
                <p><strong>Estado:</strong> ${escapeHtml(orderStatusLabels[order.orderStatus] || order.orderStatus)}</p>
              </div>
              <div>
                <p><strong>Total:</strong> ${formatOrderCurrency(order.total)}</p>
                <p><strong>Pago:</strong> ${escapeHtml(paymentStatusLabels[order.paymentStatus] || order.paymentStatus)}</p>
                <p><strong>Medio:</strong> ${escapeHtml(paymentMethodLabels[order.paymentMethod] || order.paymentMethod)}</p>
              </div>
            </div>
            <div class="grid">
              <div>
                <p><strong>Cliente:</strong> ${escapeHtml(order.user.name || order.user.email)}</p>
                <p><strong>Email:</strong> ${escapeHtml(order.user.email)}</p>
                <p><strong>Teléfono:</strong> ${escapeHtml(order.user.phone || "N/A")}</p>
                ${shippingHtml}
                ${notesHtml}
              </div>
              <div>
                <p><strong>Productos:</strong></p>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th class="num">Unitario</th>
                      <th class="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemsList}</tbody>
                </table>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Checkbox
                  checked={selectedOrders.size > 0 && selectedOrders.size === routeEligibleOrderIds.size}
                  onCheckedChange={toggleAll}
                  disabled={routeEligibleOrderIds.size === 0}
                />
                <span className="text-sm leading-tight">
                  Seleccionar ruta ({selectedOrders.size} de {routeEligibleOrderIds.size})
                </span>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                {/* Acciones masivas */}
                {selectedOrders.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isLoading} className="w-full whitespace-nowrap px-3 sm:w-auto">
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
                      className="w-full whitespace-nowrap px-3 sm:w-auto"
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
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="outline" onClick={() => setEstimateStockOpen(false)}>
                        Cerrar
                      </Button>
                      <Button variant="outline" onClick={handlePrint} disabled={estimatedStock.length === 0}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir
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
                    <Button disabled={selectedOrders.size === 0} className="w-full whitespace-nowrap px-3 sm:w-auto">
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

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

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
            const isRouteEligible = routeEligibleOrderIds.has(order.id)
            const formattedAddress = formatShippingAddress(order.shippingAddress)
            const routeIneligibilityReason = getRouteIneligibilityReason(
              order,
              requiresPaymentToFulfill
            )

            return (
              <Card key={order.id} className={`
                hover:bg-muted/50 transition-colors
                ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}
                ${!isRouteEligible ? "opacity-70" : ""}
              `}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={!isRouteEligible}
                        onCheckedChange={() => toggleOrder(order.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 space-y-1">
                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                          <CardTitle className="break-words pr-2 text-base leading-tight sm:pr-0">
                            {order.orderNumber}
                          </CardTitle>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintOrder(order)}
                        className="shrink-0"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                      </Button>
                      <span className={`inline-flex shrink-0 rounded px-2 py-1 text-xs font-medium ${orderStatusColors[order.orderStatus] || "bg-gray-100 text-gray-800"}`}>
                        {orderStatusLabels[order.orderStatus] || order.orderStatus}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="space-y-2">
                      <p className="font-medium">
                        {order.user.name || order.user.email}
                      </p>
                      <p className="text-muted-foreground">{order.user.email}</p>
                      {order.user.phone ? (
                        <p className="text-muted-foreground">{order.user.phone}</p>
                      ) : null}
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="font-medium">
                        {order.shippingMethod === "pickup" ? "Retiro en tienda" : "Envío a domicilio"}
                      </p>
                      {order.shippingMethod !== "pickup" ? (
                        formattedAddress ? (
                          <>
                            <p className="text-muted-foreground">{formattedAddress.streetLine}</p>
                            <p className="text-muted-foreground">{formattedAddress.localityLine}</p>
                            {formattedAddress.instructions ? (
                              <p className="text-muted-foreground">Indicaciones: {formattedAddress.instructions}</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-muted-foreground">Sin domicilio de entrega</p>
                        )
                      ) : null}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-bold">{formatOrderCurrency(order.total)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 md:justify-end">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-700"}`}>
                          {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <p className="font-medium">Items del pedido</p>
                      <div className="rounded-md border bg-muted/30 p-3">
                        <ul className="divide-y">
                          {order.items.map((item) => (
                            <li key={item.id} className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                              <div className="min-w-0">
                                <p className="break-words text-muted-foreground">
                                  {item.quantity}x {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Unitario: {formatOrderCurrency(item.price)}
                                </p>
                              </div>
                              <p className="font-medium sm:text-right">
                                {formatOrderCurrency(item.unitTotal)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {!isRouteEligible && (
                        <p className="mt-1 text-xs text-orange-600">
                          No apto para hoja de ruta: {routeIneligibilityReason || "pendiente de validación"}
                        </p>
                      )}
                      {order.customerNotes ? (
                        <p className="text-xs text-muted-foreground">
                          Nota: {order.customerNotes}
                        </p>
                      ) : null}
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
