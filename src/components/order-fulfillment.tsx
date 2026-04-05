"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Save, 
  AlertCircle 
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

interface OrderItem {
  id: string
  name: string
  quantity: number
  quantityOrdered: number | null
  quantityFulfilled: number | null
  missingReason: string | null
  price: any
}

interface OrderFulfillmentProps {
  orderId: string
  items: OrderItem[]
  currentStatus: string
}

export function OrderFulfillment({ orderId, items, currentStatus }: OrderFulfillmentProps) {
  const router = useRouter()
  const [fusing, setFusing] = useState(false)
  const [fulfillmentData, setFulfillmentData] = useState(
    items.map(item => ({
      itemId: item.id,
      name: item.name,
      ordered: item.quantityOrdered ?? item.quantity,
      fulfilled: item.quantityFulfilled ?? (item.quantityOrdered ?? item.quantity),
      missingReason: item.missingReason || ""
    }))
  )

  const handleFulfilledChange = (index: number, value: string) => {
    const newVal = parseInt(value)
    if (isNaN(newVal)) return

    const newData = [...fulfillmentData]
    // Clamp between 0 and ordered
    newData[index].fulfilled = Math.min(Math.max(0, newVal), newData[index].ordered)
    setFulfillmentData(newData)
  }

  const handleReasonChange = (index: number, value: string) => {
    const newData = [...fulfillmentData]
    newData[index].missingReason = value
    setFulfillmentData(newData)
  }

  const saveFulfillment = async () => {
    setFusing(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fulfillment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: fulfillmentData })
      })

      if (response.ok) {
        toast({
          title: "Cumplimiento actualizado",
          description: "Se han guardado los cambios en el stock del pedido."
        })
        router.refresh()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "No se pudo actualizar el cumplimiento"
        })
      }
    } catch (error) {
      console.error("Save fulfillment error:", error)
      toast({
        variant: "destructive",
        title: "Error de red",
        description: "Hubo un problema al conectar con el servidor"
      })
    } finally {
      setFusing(false)
    }
  }

  const hasMissing = fulfillmentData.some(d => d.fulfilled < d.ordered)

  return (
    <Card className={hasMissing ? "border-orange-200" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Gestión de Preparación / Stock
            </CardTitle>
            <CardDescription>
              Indicá la cantidad real que estás enviando de cada producto.
            </CardDescription>
          </div>
          <Button onClick={saveFulfillment} disabled={fusing} size="sm">
            {fusing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasMissing && (
          <Alert variant="warning" className="bg-orange-50 border-orange-200 text-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="font-bold">Atención: Pedido Incompleto</AlertTitle>
            <AlertDescription className="text-xs">
              Has indicado que faltan productos. Recordá que deberás realizar el reembolso parcial o nota de crédito correspondiente según el medio de pago.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {fulfillmentData.map((item, idx) => (
            <div key={item.itemId} className="flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-lg border bg-muted/30">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">Pedido: {item.ordered} unidades</p>
              </div>
              
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">A enviar</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.fulfilled}
                      onChange={(e) => handleFulfilledChange(idx, e.target.value)}
                      className="w-20 h-8 text-center"
                      min={0}
                      max={item.ordered}
                    />
                    <span className="text-sm font-medium">/ {item.ordered}</span>
                  </div>
                </div>

                {item.fulfilled < item.ordered && (
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <Label className="text-[10px] uppercase font-bold text-orange-600">Motivo del faltante</Label>
                    <Input
                      placeholder="Ej: Sin stock del proveedor"
                      value={item.missingReason}
                      onChange={(e) => handleReasonChange(idx, e.target.value)}
                      className="h-8 text-xs border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
