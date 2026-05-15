"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useNavigationFeedback } from "@/components/navigation-feedback"
import { getDateInputValueInTimeZone, getDateRangeForDateInput } from "@/lib/time-zone"
import { AlertCircle, Printer } from "lucide-react"
import { createRouteSheet } from "@/lib/actions/route-sheet-actions"
import { updateOrdersStatus } from "@/lib/actions/order-actions"
import { formatDate, formatDateTime } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { StockSummaryDialog } from "@/components/admin/stock-summary-dialog"
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
  quantityFulfilled?: number | null
  quantityMissing?: number | null
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
  requiresPaymentToFulfill: boolean
  timeZone?: string | null
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

function isPickupShippingMethod(shippingMethod: string) {
  const normalized = shippingMethod.trim().toLowerCase()
  return normalized.includes("pickup") || normalized.includes("retiro")
}

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
  if (isPickupShippingMethod(order.shippingMethod)) {
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
  requiresPaymentToFulfill,
  timeZone,
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
  const [routeName, setRouteName] = useState(`Ruta ${formatDate(new Date(), undefined, timeZone)}`)
  const [routeDate, setRouteDate] = useState(getDateInputValueInTimeZone(new Date(), timeZone))
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

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open)
    setError(null)
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
    const orderIds = orders.map((order) => order.id)

    if (selectedOrders.size === orderIds.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orderIds))
    }
  }

  // Crear hoja de ruta
  const handleCreateRouteSheet = async () => {
    if (selectedOrders.size === 0) return

    const ineligibleSelectedOrders = orders
      .filter((order) => selectedOrders.has(order.id))
      .map((order) => ({
        orderNumber: order.orderNumber,
        reason: getRouteIneligibilityReason(order, requiresPaymentToFulfill),
      }))
      .filter((order): order is { orderNumber: string; reason: string } => Boolean(order.reason))

    if (ineligibleSelectedOrders.length > 0) {
      const examples = ineligibleSelectedOrders
        .slice(0, 3)
        .map((order) => `${order.orderNumber}: ${order.reason}`)
        .join("; ")
      const remaining = ineligibleSelectedOrders.length > 3
        ? ` y ${ineligibleSelectedOrders.length - 3} más`
        : ""

      setError(
        `No se puede crear una hoja de ruta con pedidos no aptos para reparto. Quitá de la selección: ${examples}${remaining}.`
      )
      setCreateDialogOpen(true)
      return
    }

    setIsLoading(true)
    setError(null)

    const { start } = getDateRangeForDateInput(routeDate, timeZone)
    
    const result = await createRouteSheet(
      routeName,
      Array.from(selectedOrders),
      start
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

  const selectedStockItems = orders
    .filter((order) => selectedOrders.has(order.id))
    .flatMap((order) =>
      order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantityOrdered: item.quantity,
        quantityFulfilled: item.quantityFulfilled,
        quantityMissing: item.quantityMissing,
      }))
    )

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

    const customerNotesHtml = order.customerNotes
      ? `<div class="field wide"><span>Notas</span><strong>${escapeHtml(order.customerNotes)}</strong></div>`
      : ""

    const customerDetails = [
      ["Pedido", order.orderNumber],
      ["Fecha", formatDate(order.createdAt, undefined, timeZone)],
      ["Estado", orderStatusLabels[order.orderStatus] || order.orderStatus],
      ["Total", formatOrderCurrency(order.total)],
      ["Pago", paymentStatusLabels[order.paymentStatus] || order.paymentStatus],
      ["Medio", paymentMethodLabels[order.paymentMethod] || order.paymentMethod],
      ["Cliente", order.user.name || order.user.email],
      ["Email", order.user.email],
      ["Teléfono", order.user.phone || "N/A"],
      ["Modalidad", order.shippingMethod === "pickup" ? "Retiro en tienda" : "Envío a domicilio"],
      [
        "Dirección",
        order.shippingMethod === "pickup"
          ? "N/A"
          : address?.streetLine || "Sin domicilio cargado",
      ],
      [
        "Localidad",
        order.shippingMethod === "pickup"
          ? "N/A"
          : address?.localityLine || "Sin domicilio cargado",
      ],
    ]

    const customerDetailsHtml = customerDetails
      .map(([label, value]) => `
        <div class="field">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `)
      .join("")

    const instructionsHtml = address?.instructions
      ? `<div class="field wide"><span>Indicaciones</span><strong>${escapeHtml(address.instructions)}</strong></div>`
      : ""

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(order.orderNumber)}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 24px; margin-bottom: 6px; }
            .meta { font-size: 14px; color: #555; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .sheet { border: 1px solid #000; padding: 16px; }
            .section-title { font-size: 16px; font-weight: 700; margin: 0 0 10px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 10px; border-bottom: 1px solid #ddd; padding-bottom: 14px; margin-bottom: 16px; }
            .field { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 8px; align-items: baseline; }
            .field span { color: #555; font-size: 13px; }
            .field strong { font-size: 14px; overflow-wrap: anywhere; }
            .field.wide { grid-column: 1 / -1; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 0; text-align: left; vertical-align: top; }
            th:first-child, td:first-child { padding-right: 12px; }
            th { font-size: 12px; color: #555; }
            .num { text-align: right; white-space: nowrap; }
            .item-col { width: auto; }
            .price-col { width: 110px; }
            p { margin: 0 0 8px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Ficha de Pedido</h1>
          <div class="meta">
            Generado el ${formatDateTime(new Date(), timeZone)}
          </div>
          <div class="sheet">
            <p class="section-title">Datos del pedido y cliente</p>
            <div class="details">
              ${customerDetailsHtml}
              ${instructionsHtml}
              ${customerNotesHtml}
            </div>
            <p class="section-title">Productos</p>
            <table>
              <thead>
                <tr>
                  <th class="item-col">Item</th>
                  <th class="num price-col">Unitario</th>
                  <th class="num price-col">Total</th>
                </tr>
              </thead>
              <tbody>${itemsList}</tbody>
            </table>
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
                  checked={selectedOrders.size > 0 && selectedOrders.size === orders.length}
                  onCheckedChange={toggleAll}
                  disabled={orders.length === 0}
                />
                <span className="text-sm leading-tight">
                  Seleccionar pedidos ({selectedOrders.size} de {orders.length})
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
                <StockSummaryDialog
                  triggerLabel={`📦 Stock (${selectedOrders.size})`}
                  disabled={selectedOrders.size === 0}
                  title="Stock estimado"
                  selectionLabel={`Pedidos seleccionados: ${selectedOrders.size}`}
                  items={selectedStockItems}
                  timeZone={timeZone}
                />

                {/* Crear Hoja de Ruta */}
                <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
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
                      {error ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>No se pudo crear la hoja de ruta</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleCreateDialogOpenChange(false)}>
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
            const formattedAddress = formatShippingAddress(order.shippingAddress)
            const routeIneligibilityReason = getRouteIneligibilityReason(
              order,
              requiresPaymentToFulfill
            )

            return (
              <Card key={order.id} className={`
                hover:bg-muted/50 transition-colors
                ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}
              `}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Checkbox
                        checked={isSelected}
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
                          {formatDate(order.createdAt, undefined, timeZone)}
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
                        {isPickupShippingMethod(order.shippingMethod) ? "Retiro en tienda" : "Envío a domicilio"}
                      </p>
                      {!isPickupShippingMethod(order.shippingMethod) ? (
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
                      {routeIneligibilityReason ? (
                        <p className="mt-1 text-xs text-orange-600">
                          No apto para hoja de ruta: {routeIneligibilityReason}
                        </p>
                      ) : null}
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
