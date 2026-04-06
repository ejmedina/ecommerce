"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  reorderRouteSheetItem, 
  setDeliveryOutcome 
} from "@/lib/actions/route-sheet-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UpdateCoordinatesDialog } from "@/components/logistics/update-coordinates-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { ArrowUp, ArrowDown, Phone, MessageCircle, AlertTriangle, Check, X, MapPin, Navigation, GripVertical, Globe } from "lucide-react"

interface OrderCardProps {
  item: {
    id: string
    position: number
    notes: string | null
    deliveryOutcome: string | null
    deliveryFailureReason: string | null
    deliveryNotes: string | null
    deliveredAt: string | null
    order: {
      id: string
      orderNumber: string
      total: any
      orderStatus: string
      shippingAddress: any
      user: {
        name: string | null
        email: string
        phone: string | null
      }
      items: {
        id: string
        name: string
        quantityOrdered: number | null
        quantity: number | null
        quantityMissing: number | null
        quantityFulfilled: number | null
        missingReason: string | null
        product: {
          id: string
          name: string
          sku: string | null
        }
      }[]
    }
  }
  index: number
  mode: "preparation" | "delivery"
  totalItems: number
  whatsappMessage?: string
  storeName?: string
}

const failureReasons = [
  { value: "CUSTOMER_NOT_HOME", label: "No estaba el cliente" },
  { value: "WRONG_ADDRESS", label: "Domicilio incorrecto" },
  { value: "INACCESSIBLE_LOCATION", label: "Lugar inaccesible" },
  { value: "CUSTOMER_REFUSED", label: "Cliente rechazó" },
  { value: "OTHER", label: "Otro" },
]

export function OrderCard({ item, index, mode, totalItems, whatsappMessage, storeName }: OrderCardProps) {
  const router = useRouter()
  const shippingAddress = item.order.shippingAddress as any
  const phone = item.order.user.phone || shippingAddress?.phone
  const isDelivered = item.deliveryOutcome === "DELIVERED"
  const isNotDelivered = item.deliveryOutcome === "NOT_DELIVERED"

  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState<"DELIVERED" | "NOT_DELIVERED">("DELIVERED")
  const [failureReason, setFailureReason] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Coordinate validation for UI highlighting
  // Range expanded slightly but strict enough to catch ocean or weird locations
  const hasBadCoords = shippingAddress?.lat && shippingAddress?.lng && (
    shippingAddress.lat > -10 || shippingAddress.lat < -56 || 
    shippingAddress.lng > -30 || shippingAddress.lng < -76
  )
  const hasNoCoords = !shippingAddress?.lat || !shippingAddress?.lng

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: mode !== "preparation" })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as any
  }

  // Generar mensaje de WhatsApp personalizado
  const getWhatsAppMessage = () => {
    if (!whatsappMessage) return "Hola, llegamos en menos de 10 minutos."
    return whatsappMessage.replace(/\[NOMBRE_TIENDA\]/g, storeName || "la tienda")
  }

  const encodedMessage = encodeURIComponent(getWhatsAppMessage())

  const handleReorder = async (direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === totalItems - 1)) {
      return
    }
    await reorderRouteSheetItem(item.id, direction)
    router.refresh()
  }

  const handleSetDeliveryOutcome = async () => {
    if (deliveryStatus === "NOT_DELIVERED" && !failureReason) return
    setIsLoading(true)
    await setDeliveryOutcome(
      item.id,
      deliveryStatus,
      deliveryStatus === "NOT_DELIVERED" ? failureReason as any : undefined,
      deliveryNotes || undefined
    )
    setIsLoading(false)
    setDeliveryDialogOpen(false)
    router.refresh()
  }

  // Helper para obtener cantidad total del item (usa quantityOrdered o fallback a quantity)
  const getQuantity = (orderItem: any) => {
    return orderItem.quantityOrdered ?? orderItem.quantity ?? 0
  }

  // Helper para verificar si tiene faltantes
  const hasMissing = (orderItem: any) => {
    return (orderItem.quantityMissing ?? 0) > 0
  }

  // VISTA DE REPARTO - Formato práctica
  if (mode === "delivery") {
    const displayAddress = shippingAddress?.shippingMethod === "pickup" 
      ? "Retiro en tienda" 
      : `${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}`

    return (
      <Card 
        ref={setNodeRef} 
        style={style} 
        className={`
        ${isDelivered ? "bg-green-50 border-green-200" : ""}
        ${isNotDelivered ? "bg-red-50 border-red-200" : ""}
        ${isDragging ? 'opacity-70 shadow-lg ring-2 ring-primary border-primary' : ''}
      `}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Sequence number for easy bag identification */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shrink-0 shadow-sm border-2 border-white">
                {index + 1}
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">
                  {item.order.user.name || item.order.user.email}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Pedido #{item.order.orderNumber}</p>
              </div>
            </div>
            {isDelivered && (
              <Badge variant="success" className="text-sm">✓ Entregado</Badge>
            )}
            {isNotDelivered && (
              <Badge variant="destructive" className="text-sm">✗ No entregado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Contact Info */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{displayAddress}</p>
              {shippingAddress?.shippingMethod !== "pickup" && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}, ${shippingAddress?.state || ''}, Argentina`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600">
                    <Navigation className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
            {phone && (
              <div className="flex gap-2 flex-wrap">
                <a href={`tel:${phone}`}>
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4 mr-1" />
                    {phone}
                  </Button>
                </a>
                {phone && (
                  <>
                    <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        WhatsApp
                      </Button>
                    </a>
                    <a 
                      href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodedMessage}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="secondary">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Notificar
                      </Button>
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Items summary */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Productos:</p>
            {item.order.items.map((orderItem) => {
              const qty = getQuantity(orderItem)
              const missing = orderItem.quantityMissing ?? 0
              const hasFaltante = missing > 0
              return (
                <div key={orderItem.id} className="flex justify-between text-sm">
                  <span>
                    {qty}x {orderItem.name}
                    {hasFaltante && <span className="text-red-500 ml-1">(Faltante: {missing})</span>}
                  </span>
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Delivery Action */}
          {!isDelivered && !isNotDelivered && (
            <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  Registrar Entrega
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Resultado de Entrega</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Button 
                      variant={deliveryStatus === "DELIVERED" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setDeliveryStatus("DELIVERED")}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Entregado
                    </Button>
                    <Button 
                      variant={deliveryStatus === "NOT_DELIVERED" ? "destructive" : "outline"}
                      className="flex-1"
                      onClick={() => setDeliveryStatus("NOT_DELIVERED")}
                    >
                      <X className="w-4 h-4 mr-1" />
                      No entregado
                    </Button>
                  </div>

                  {deliveryStatus === "NOT_DELIVERED" && (
                    <div className="space-y-2">
                      <Label>Motivo</Label>
                      <Select value={failureReason} onValueChange={setFailureReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {failureReasons.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Observaciones adicionales..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSetDeliveryOutcome} 
                    disabled={isLoading || (deliveryStatus === "NOT_DELIVERED" && !failureReason)}
                  >
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Show failure reason if not delivered */}
          {isNotDelivered && (
            <div className="text-sm text-red-600">
              <p className="font-medium">No entregado</p>
              <p>{failureReasons.find(r => r.value === item.deliveryFailureReason)?.label}</p>
              {item.deliveryNotes && <p className="text-muted-foreground">{item.deliveryNotes}</p>}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setDeliveryDialogOpen(true)}
              >
                Modificar
              </Button>
            </div>
          )}

          {/* Link to detail */}
          <Link href={`/admin/orders/${item.order.id}`}>
            <Button variant="link" size="sm" className="w-full">
              Ver detalle completo →
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const displayAddress = shippingAddress?.shippingMethod === "pickup" 
    ? "Retiro en tienda" 
    : `${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}`

  return (
    <Card className={hasBadCoords ? "border-amber-500 bg-amber-50/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Drag handle for preparation mode */}
            {mode === "preparation" && (
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 p-2 -ml-2"
              >
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            
            {/* Reorder buttons */}
            <div className="flex flex-col gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                disabled={index === 0}
                onClick={() => handleReorder("up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                disabled={index === totalItems - 1}
                onClick={() => handleReorder("down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Proeminent sequence number for bag labeling */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground shrink-0 shadow-sm border-2 border-white">
                {index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {item.order.user.name || item.order.user.email}
                  </CardTitle>
                  {isDelivered && <Badge variant="success">✓ Entregado</Badge>}
                  {isNotDelivered && <Badge variant="destructive">✗ No entregado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Pedido #{item.order.orderNumber} • {formatCurrency(Number(item.order.total))}
                </p>
                {shippingAddress?.lat && shippingAddress?.lng && (
                  <div className={`flex items-center gap-1.5 text-[11px] font-mono mt-1 ${hasBadCoords ? "text-amber-600 font-bold" : "text-muted-foreground"}`}>
                    <Globe className="h-3 w-3" />
                    <span>GPS: {shippingAddress.lat.toFixed(6)}, {shippingAddress.lng.toFixed(6)}</span>
                    {hasBadCoords && <AlertTriangle className="h-3 w-3 animate-pulse" />}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phone && (
              <a href={`tel:${phone}`}>
                <Button size="sm" variant="outline">
                  <Phone className="w-4 h-4 mr-1" />
                  {phone}
                </Button>
              </a>
            )}
            <div className="flex gap-2">
              <UpdateCoordinatesDialog 
                orderId={item.order.id}
                currentLat={shippingAddress?.lat}
                currentLng={shippingAddress?.lng}
                addressLabel={`${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}`}
                onUpdate={() => startTransition(() => router.refresh())}
              />
              <Link href={`/admin/orders/${item.order.id}`}>
                <Button size="sm" variant="outline" className="h-9">
                  Ver pedido
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {hasBadCoords && (
          <div className="mt-2 bg-amber-100 text-amber-800 p-2 rounded-md text-xs flex items-center gap-2 border border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <span><strong>Ubicación detectada fuera de rango ({shippingAddress.lat}, {shippingAddress.lng}).</strong> El ruteo automático podría fallar. Por favor corrija las coordenadas manualmente.</span>
          </div>
        )}
        {hasNoCoords && shippingAddress?.shippingMethod !== "pickup" && (
          <div className="mt-2 bg-blue-50 text-blue-700 p-2 rounded-md text-xs flex items-center gap-2 border border-blue-100 italic">
            <Globe className="h-4 w-4" />
            <span>Sin datos geoespaciales. Se intentará geocodificar al optimizar.</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Dirección:</p>
            <p className="text-sm text-muted-foreground">{displayAddress}</p>
          </div>
          {shippingAddress?.shippingMethod !== "pickup" && (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}, ${shippingAddress?.state || ''}, Argentina`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1"
            >
              <Button size="sm" variant="ghost" className="text-blue-600 h-8 gap-1 p-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs">Mapa</span>
              </Button>
            </a>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="text-sm font-medium mb-2">Productos:</p>
          <div className="space-y-2">
            {item.order.items.map((orderItem) => {
              const qty = getQuantity(orderItem)
              const missing = orderItem.quantityMissing ?? 0
              const hasFaltante = missing > 0
              return (
                <div 
                  key={orderItem.id} 
                  className={`
                    flex justify-between items-center text-sm p-2 rounded
                    ${hasFaltante ? "bg-red-50 border border-red-200" : "bg-muted/50"}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {hasFaltante ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Checkbox checked={true} disabled />
                    )}
                    <span>
                      {qty}x {orderItem.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasFaltante ? (
                      <span className="text-red-500 font-medium">
                        Faltante: {missing}
                        {orderItem.missingReason && (
                          <span className="text-xs ml-1">({orderItem.missingReason})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm">Completo</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Missing items summary */}
        {item.order.items.some(oi => (oi.quantityMissing ?? 0) > 0) && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm font-medium text-red-600">
              ⚠️ Tiene productos con faltantes
            </p>
          </div>
        )}

        {/* Delivery result for preparation mode */}
        {item.deliveryOutcome && (
          <div className={`
            p-3 rounded
            ${isDelivered ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}
          `}>
            <p className="text-sm font-medium">
              {isDelivered ? "✓ Entregado" : "✗ No entregado"}
              {item.deliveredAt && (
                <> • {new Date(item.deliveredAt).toLocaleString("es-AR")}</>
              )}
            </p>
            {item.deliveryFailureReason && (
              <p className="text-sm text-muted-foreground">
                {failureReasons.find(r => r.value === item.deliveryFailureReason)?.label}
              </p>
            )}
            {item.deliveryNotes && (
              <p className="text-sm text-muted-foreground">{item.deliveryNotes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
