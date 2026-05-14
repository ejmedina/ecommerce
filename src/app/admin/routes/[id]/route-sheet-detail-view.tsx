"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderCard, type RouteSheetOrderCardItem } from "./order-card"
import { getEffectiveDeliveryOutcome } from "../delivery-status"
import { RouteSheetActions } from "./route-sheet-actions"
import { SortableRouteItems } from "./sortable-route-items"

type RouteSheetDetail = {
  id: string
  name: string
  date: string
  createdAt: string
  updatedAt: string
  notes: string | null
  status: string
  createdBy?: {
    name: string | null
  } | null
  items: RouteSheetOrderCardItem[]
  startDepotId?: string | null
  endDepotId?: string | null
  vehicleId?: string | null
}

type LogisticsOption = {
  id: string
  name: string
}

interface RouteSheetDetailViewProps {
  routeSheet: RouteSheetDetail
  whatsappMessage: string
  storeName: string
  depots: LogisticsOption[]
  vehicles: LogisticsOption[]
}

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PREPARATION: "En preparación",
  IN_DELIVERY: "En reparto",
  COMPLETED: "Finalizada",
  CANCELLED: "Cancelada",
}

export function RouteSheetDetailView({
  routeSheet,
  whatsappMessage,
  storeName,
  depots,
  vehicles,
}: RouteSheetDetailViewProps) {
  const [activeView, setActiveView] = useState("preparation")
  const routeItems = routeSheet.items
  const deliveredCount = routeItems.filter(
    (item) => getEffectiveDeliveryOutcome(item) === "DELIVERED"
  ).length
  const notDeliveredCount = routeItems.filter(
    (item) => getEffectiveDeliveryOutcome(item) === "NOT_DELIVERED"
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link href="/admin/routes" className="text-sm text-muted-foreground hover:underline">
            ← Volver a Hojas de Ruta
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{routeSheet.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Fecha: {new Date(routeSheet.date).toLocaleDateString("es-AR")}</span>
            <span>•</span>
            <span>Creada por: {routeSheet.createdBy?.name || "Sistema"}</span>
            <span>•</span>
            <span>{routeItems.length} pedidos</span>
          </div>
        </div>
        <div className="flex w-full max-w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <Badge variant="outline" className="px-3 py-1 text-lg">
            {statusLabels[routeSheet.status]}
          </Badge>
          <RouteSheetActions
            routeSheet={routeSheet}
            showWorkflowAction={activeView === "preparation"}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{routeItems.length}</p>
              <p className="text-sm text-muted-foreground">Total pedidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
              <p className="text-sm text-muted-foreground">Entregados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {routeItems.length - deliveredCount - notDeliveredCount}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {routeSheet.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{routeSheet.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList>
          <TabsTrigger value="preparation">Preparación</TabsTrigger>
          <TabsTrigger value="delivery">Reparto</TabsTrigger>
        </TabsList>

        <TabsContent value="preparation" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ordene los pedidos y prepare la mercadería. Marque los faltantes o utilice optimización de ruteo.
          </p>
          <SortableRouteItems
            items={routeSheet.items}
            whatsappMessage={whatsappMessage}
            storeName={storeName}
            depots={depots}
            vehicles={vehicles}
            routeSheet={routeSheet}
          />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vista optimizada para usar durante la entrega.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {routeItems.map((item, index) => (
              <OrderCard
                key={item.id}
                item={item}
                index={index}
                mode="delivery"
                totalItems={routeItems.length}
                whatsappMessage={whatsappMessage}
                storeName={storeName}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
