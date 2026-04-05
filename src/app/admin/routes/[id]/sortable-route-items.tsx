"use client"

import { useState, useTransition } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { OrderCard } from "./order-card"
import { reorderRouteSheetItemsBatch, optimizeRouteOrder } from "@/lib/actions/route-sheet-actions"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Wand2 } from "lucide-react"

interface SortableRouteItemsProps {
  items: any[]
  whatsappMessage: string
  storeName: string
  depots: any[]
  vehicles: any[]
  routeSheet: any
}

export function SortableRouteItems({ items, whatsappMessage, storeName, depots, vehicles, routeSheet }: SortableRouteItemsProps) {
  const [activeItems, setActiveItems] = useState(items)
  const [isPending, startTransition] = useTransition()
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [startDepotId, setStartDepotId] = useState(routeSheet.startDepotId || "none")
  const [endDepotId, setEndDepotId] = useState(routeSheet.endDepotId || "none")
  const [vehicleId, setVehicleId] = useState(routeSheet.vehicleId || "none")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    
    if (active.id !== over.id) {
      const oldIndex = activeItems.findIndex(i => i.id === active.id)
      const newIndex = activeItems.findIndex(i => i.id === over.id)
      
      const newItems = arrayMove(activeItems, oldIndex, newIndex)
      setActiveItems(newItems)

      // Sync with server in background
      startTransition(async () => {
        const itemIdsInOrder = newItems.map(i => i.id)
        await reorderRouteSheetItemsBatch(routeSheet.id, itemIdsInOrder)
      })
    }
  }

  const handleOptimization = async () => {
    setIsOptimizing(true)
    setErrorMsg("")
    try {
      const result = await optimizeRouteOrder(
        routeSheet.id, 
        startDepotId === "none" ? null : startDepotId, 
        endDepotId === "none" ? null : endDepotId, 
        vehicleId === "none" ? null : vehicleId
      )
      if (result && !result.success) {
        setErrorMsg(result.error || "Ocurrió un error en el ruteo.")
      } else {
        // Successful optimization will trigger revalidation, but page refresh is needed to see new order since it's server-driven props
        window.location.reload()
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Optimization Header Controls */}
      <div className="bg-muted/50 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
          <div className="space-y-1">
            <label className="text-sm font-medium">Vehículo (Opcional)</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asginar</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Sale de (Opcional)</label>
            <Select value={startDepotId} onValueChange={setStartDepotId}>
              <SelectTrigger>
                <SelectValue placeholder="Base / Depósito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin base de salida</SelectItem>
                {depots.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Llega a (Opcional)</label>
            <Select value={endDepotId} onValueChange={setEndDepotId}>
              <SelectTrigger>
                <SelectValue placeholder="Base / Depósito destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin base destino</SelectItem>
                {depots.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={handleOptimization} 
          disabled={isOptimizing || activeItems.length === 0}
          className="shrink-0"
        >
          {isOptimizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Optimizar Ruta
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errorMsg}
        </div>
      )}

      {isPending && <p className="text-sm text-muted-foreground animate-pulse">Guardando orden...</p>}

      {/* Sortable List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {activeItems.map((item, index) => (
              <OrderCard
                key={item.id}
                item={item}
                index={index}
                mode="preparation"
                totalItems={activeItems.length}
                whatsappMessage={whatsappMessage}
                storeName={storeName}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
