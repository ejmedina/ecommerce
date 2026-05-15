"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  updateRouteSheetStatus, 
  updateRouteSheet,
} from "@/lib/actions/route-sheet-actions"
import { getCommercialOrderItems } from "@/lib/order-commercial"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
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
import { type RouteSheetOrderCardItem } from "./order-card"

type RouteSheetWorkflowStatus =
  | "DRAFT"
  | "IN_PREPARATION"
  | "IN_DELIVERY"
  | "COMPLETED"
  | "CANCELLED"

interface RouteSheetActionsProps {
  routeSheet: {
    id: string
    name: string
    date: Date | string
    notes: string | null
    status: string
  }
  showWorkflowAction?: boolean
}

const statusFlow: Partial<Record<RouteSheetWorkflowStatus, RouteSheetWorkflowStatus>> = {
  DRAFT: "IN_PREPARATION",
  IN_PREPARATION: "IN_DELIVERY",
  IN_DELIVERY: "COMPLETED",
}

const nextStatusLabels: Record<string, string> = {
  DRAFT: "Iniciar Preparación",
  IN_PREPARATION: "Iniciar Reparto",
  IN_DELIVERY: "Finalizar",
}

type RouteSheetWithItems = RouteSheetActionsProps["routeSheet"] & {
  items: RouteSheetOrderCardItem[]
}

export function RouteSheetActions({
  routeSheet,
  showWorkflowAction = true,
}: {
  routeSheet: RouteSheetWithItems
  showWorkflowAction?: boolean
}) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [name, setName] = useState(routeSheet.name)
  const [notes, setNotes] = useState(routeSheet.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  const nextStatus = statusFlow[routeSheet.status as RouteSheetWorkflowStatus]

  const handleStatusChange = async () => {
    if (!nextStatus) return
    setIsLoading(true)
    const result = await updateRouteSheetStatus(routeSheet.id, nextStatus)
    setIsLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  const handleCancel = async () => {
    setIsLoading(true)
    const result = await updateRouteSheetStatus(routeSheet.id, "CANCELLED")
    setIsLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  const handleSaveEdit = async () => {
    setIsLoading(true)
    const result = await updateRouteSheet(routeSheet.id, { name, notes })
    setIsLoading(false)
    if (result.success) {
      setIsEditOpen(false)
      router.refresh()
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const ordersHtml = routeSheet.items.map((item, index) => {
      const order = item.order
      const address = order.shippingAddress
      const itemsList = getCommercialOrderItems(order.items).map((oi) =>
        `<li>
          <div>${oi.quantityOrdered}x ${oi.name}${oi.itemType === "COMBO" ? ' <span style="font-size:11px;border:1px solid #bbb;border-radius:999px;padding:1px 8px;color:#666;">Combo</span>' : ""}</div>
          ${oi.components.length > 0 ? `
            <ul style="margin: 6px 0 0; padding-left: 18px; color: #666; font-size: 12px;">
              ${oi.components.map((component) => `<li>${component.quantityOrdered}x ${component.name}</li>`).join("")}
            </ul>
          ` : ""}
        </li>`
      ).join('')

      return `
        <div style="border: 1px solid #000; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
            <h2 style="margin: 0; font-size: 18px;">Parada #${index + 1} - Orden ${order.orderNumber}</h2>
            <span style="font-weight: bold;">$${Number(order.total).toLocaleString('es-AR')}</span>
          </div>
          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
            <div>
              <p><strong>Cliente:</strong> ${order.user.name || 'Invitado'}</p>
              <p><strong>Teléfono:</strong> ${order.user.phone || 'N/A'}</p>
              <p><strong>Dirección:</strong> ${address?.street || ''} ${address?.number || ''} ${address?.floor ? ', Piso ' + address.floor : ''} ${address?.apartment ? ', Depto ' + address.apartment : ''}</p>
              <p><strong>Localidad:</strong> ${address?.city || ''}, ${address?.state || ''}</p>
              ${order.customerNotes ? `<p><strong>Notas:</strong> ${order.customerNotes}</p>` : ''}
            </div>
            <div>
              <p><strong>Productos:</strong></p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                ${itemsList}
              </ul>
            </div>
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>${routeSheet.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            .header-meta { font-size: 14px; color: #666; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${routeSheet.name}</h1>
          <div class="header-meta">
            Fecha: ${new Date(routeSheet.date).toLocaleDateString('es-AR')} | 
            Total: ${routeSheet.items.length} pedidos
          </div>
          ${ordersHtml}
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
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {/* Edit Button */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            Editar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Hoja de Ruta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next Status Button */}
      {showWorkflowAction && nextStatus && (
        <Button onClick={handleStatusChange} disabled={isLoading} className="whitespace-normal text-center sm:whitespace-nowrap">
          {nextStatusLabels[routeSheet.status]}
        </Button>
      )}

      {/* Cancel Button (only if not completed or cancelled) */}
      {routeSheet.status !== "COMPLETED" && routeSheet.status !== "CANCELLED" && (
        <Button variant="destructive" size="sm" onClick={handleCancel} disabled={isLoading} className="whitespace-nowrap">
          Cancelar
        </Button>
      )}

      {/* Print Button */}
      <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2 whitespace-nowrap">
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  )
}
