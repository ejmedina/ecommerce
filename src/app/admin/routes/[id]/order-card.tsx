"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  reorderRouteSheetItem, 
  registerMissingItem, 
  removeMissingItem,
  setDeliveryResult 
} from "@/lib/actions/route-sheet-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Trash2, ArrowUp, ArrowDown, Phone, MessageCircle, AlertTriangle, Check, X } from "lucide-react"

interface OrderCardProps {
  item: {
    id: string
    position: number
    notes: string | null
    order: {
      id: string
      orderNumber: string
      total: any
      status: string
      shippingAddress: any
      user: {
        name: string | null
        email: string
        phone: string | null
      }
      items: {
        id: string
        name: string
        quantity: number
        total: any
        product: {
          id: string
          name: string
          sku: string | null
        }
      }[]
    }
    missingItems: {
      id: string
      productId: string
      quantityMissing: number
      notes: string | null
    }[]
    deliveryResult: {
      id: string
      status: string
      failureReason: string | null
      notes: string | null
      deliveredAt: Date | null
    } | null
  }
  index: number
  mode: "preparation" | "delivery"
  totalItems: number
}

const failureReasons = [
  { value: "CUSTOMER_NOT_HOME", label: "No estaba el cliente" },
  { value: "WRONG_ADDRESS", label: "Domicilio incorrecto" },
  { value: "INACCESSIBLE_LOCATION", label: "Lugar inaccesible" },
]

export function OrderCard({ item, index, mode, totalItems }: OrderCardProps) {
  const router = useRouter()
  const shippingAddress = item.order.shippingAddress as any
  const phone = item.order.user.phone || shippingAddress?.phone
  const isDelivered = item.deliveryResult?.status === "DELIVERED"
  const isNotDelivered = item.deliveryResult?.status === "NOT_DELIVERED"

  const [missingDialogOpen, setMissingDialogOpen] = useState(false)
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [missingQuantity, setMissingQuantity] = useState(1)
  const [missingNotes, setMissingNotes] = useState("")
  const [deliveryStatus, setDeliveryStatus] = useState<"DELIVERED" | "NOT_DELIVERED">("DELIVERED")
  const [failureReason, setFailureReason] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleReorder = async (direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === totalItems - 1)) {
      return
    }
    await reorderRouteSheetItem(item.id, direction)
    router.refresh()
  }

  const handleRegisterMissing = async () => {
    if (!selectedProductId || missingQuantity < 1) return
    setIsLoading(true)
    await registerMissingItem(item.id, selectedProductId, missingQuantity, missingNotes || undefined)
    setIsLoading(false)
    setMissingDialogOpen(false)
    setSelectedProductId("")
    setMissingQuantity(1)
    setMissingNotes("")
    router.refresh()
  }

  const handleRemoveMissing = async (missingId: string) => {
    await removeMissingItem(missingId)
    router.refresh()
  }

  const handleSetDeliveryResult = async () => {
    if (deliveryStatus === "NOT_DELIVERED" && !failureReason) return
    setIsLoading(true)
    await setDeliveryResult(
      item.id,
      deliveryStatus,
      deliveryStatus === "NOT_DELIVERED" ? failureReason as any : undefined,
      deliveryNotes || undefined
    )
    setIsLoading(false)
    setDeliveryDialogOpen(false)
    router.refresh()
  }

  // VISTA DE REPARTO - Formato práctica
  if (mode === "delivery") {
    const displayAddress = shippingAddress?.shippingMethod === "pickup" 
      ? "Retiro en tienda" 
      : `${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}`

    return (
      <Card className={`
        ${isDelivered ? "bg-green-50 border-green-200" : ""}
        ${isNotDelivered ? "bg-red-50 border-red-200" : ""}
      `}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {item.order.user.name || item.order.user.email}
              </CardTitle>
              <p className="text-sm text-muted-foreground">#{item.order.orderNumber}</p>
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
            <p className="font-medium text-sm">{displayAddress}</p>
            {phone && (
              <div className="flex gap-2">
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
                      href={`https://wa.me/${phone.replace(/\D/g, "")}?text=Hola,%20llegamos%20en%20menos%20de%2010%20minutos.`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="secondary">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        10min
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
              const missing = item.missingItems.find(m => m.productId === orderItem.product.id)
              return (
                <div key={orderItem.id} className="flex justify-between text-sm">
                  <span>
                    {orderItem.quantity}x {orderItem.name}
                    {missing && <span className="text-red-500 ml-1">(Faltante: {missing.quantityMissing})</span>}
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
                    onClick={handleSetDeliveryResult} 
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
              <p>{failureReasons.find(r => r.value === item.deliveryResult?.failureReason)?.label}</p>
              {item.deliveryResult?.notes && <p className="text-muted-foreground">{item.deliveryResult.notes}</p>}
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

  // VISTA DE PREPARACIÓN - Tarjeta expandida
  const displayAddress = shippingAddress?.shippingMethod === "pickup" 
    ? "Retiro en tienda" 
    : `${shippingAddress?.street} ${shippingAddress?.number}, ${shippingAddress?.city}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
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
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">#{index + 1}</span>
                <CardTitle className="text-lg">
                  {item.order.user.name || item.order.user.email}
                </CardTitle>
                {isDelivered && <Badge variant="success">✓ Entregado</Badge>}
                {isNotDelivered && <Badge variant="destructive">✗ No entregado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Pedido #{item.order.orderNumber} • {formatCurrency(Number(item.order.total))}
              </p>
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
            <Link href={`/admin/orders/${item.order.id}`}>
              <Button size="sm" variant="outline">
                Ver pedido
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Address */}
        <div>
          <p className="text-sm font-medium">Dirección:</p>
          <p className="text-sm text-muted-foreground">{displayAddress}</p>
        </div>

        {/* Items */}
        <div>
          <p className="text-sm font-medium mb-2">Productos:</p>
          <div className="space-y-2">
            {item.order.items.map((orderItem) => {
              const missing = item.missingItems.find(m => m.productId === orderItem.product.id)
              return (
                <div 
                  key={orderItem.id} 
                  className={`
                    flex justify-between items-center text-sm p-2 rounded
                    ${missing ? "bg-red-50 border border-red-200" : "bg-muted/50"}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {missing ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Checkbox checked={!missing} disabled />
                    )}
                    <span>
                      {orderItem.quantity}x {orderItem.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {missing ? (
                      <>
                        <span className="text-red-500 font-medium">
                          Faltante: {missing.quantityMissing}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => handleRemoveMissing(missing.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedProductId(orderItem.product.id)}
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Marcar faltante
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Faltante</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Producto</Label>
                              <p className="font-medium">{orderItem.name}</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Cantidad faltante</Label>
                              <Input 
                                type="number" 
                                min="1" 
                                max={orderItem.quantity}
                                value={missingQuantity}
                                onChange={(e) => setMissingQuantity(parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Notas</Label>
                              <Textarea 
                                value={missingNotes}
                                onChange={(e) => setMissingNotes(e.target.value)}
                                placeholder="Observaciones..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setMissingDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleRegisterMissing} disabled={isLoading}>
                              Guardar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Missing items summary */}
        {item.missingItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm font-medium text-red-600">
              ⚠️ Faltantes registrados: {item.missingItems.length}
            </p>
          </div>
        )}

        {/* Delivery result for preparation mode */}
        {item.deliveryResult && (
          <div className={`
            p-3 rounded
            ${isDelivered ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}
          `}>
            <p className="text-sm font-medium">
              {isDelivered ? "✓ Entregado" : "✗ No entregado"}
              {item.deliveryResult.deliveredAt && (
                <> • {new Date(item.deliveryResult.deliveredAt).toLocaleString("es-AR")}</>
              )}
            </p>
            {item.deliveryResult.failureReason && (
              <p className="text-sm text-muted-foreground">
                {failureReasons.find(r => r.value === item.deliveryResult?.failureReason)?.label}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
