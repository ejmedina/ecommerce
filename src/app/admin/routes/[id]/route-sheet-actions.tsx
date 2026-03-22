"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  updateRouteSheetStatus, 
  updateRouteSheet,
  removeOrderFromRouteSheet 
} from "@/lib/actions/route-sheet-actions"
import { Button } from "@/components/ui/button"
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

interface RouteSheetActionsProps {
  routeSheet: {
    id: string
    name: string
    date: Date
    notes: string | null
    status: string
  }
}

const statusFlow = {
  DRAFT: "IN_PREPARATION",
  IN_PREPARATION: "IN_DELIVERY",
  IN_DELIVERY: "COMPLETED",
}

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PREPARATION: "En preparación",
  IN_DELIVERY: "En reparto",
  COMPLETED: "Finalizada",
  CANCELLED: "Cancelada",
}

const nextStatusLabels: Record<string, string> = {
  DRAFT: "Iniciar Preparación",
  IN_PREPARATION: "Iniciar Reparto",
  IN_DELIVERY: "Finalizar",
}

export function RouteSheetActions({ routeSheet }: RouteSheetActionsProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [name, setName] = useState(routeSheet.name)
  const [notes, setNotes] = useState(routeSheet.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  const nextStatus = statusFlow[routeSheet.status as keyof typeof statusFlow]

  const handleStatusChange = async () => {
    if (!nextStatus) return
    setIsLoading(true)
    const result = await updateRouteSheetStatus(routeSheet.id, nextStatus as any)
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

  return (
    <div className="flex items-center gap-2">
      {/* Edit Button */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
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
      {nextStatus && (
        <Button onClick={handleStatusChange} disabled={isLoading}>
          {nextStatusLabels[routeSheet.status]}
        </Button>
      )}

      {/* Cancel Button (only if not completed or cancelled) */}
      {routeSheet.status !== "COMPLETED" && routeSheet.status !== "CANCELLED" && (
        <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
          Cancelar
        </Button>
      )}
    </div>
  )
}
