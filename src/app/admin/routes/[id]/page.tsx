import Link from "next/link"
import { notFound } from "next/navigation"
import { getRouteSheet } from "@/lib/actions/route-sheet-actions"
import { getDepots, getVehicles } from "@/lib/actions/logistics-actions"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RouteSheetActions } from "./route-sheet-actions"
import { OrderCard, type RouteSheetOrderCardItem } from "./order-card"
import { SortableRouteItems } from "./sortable-route-items"

interface RouteSheetDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RouteSheetDetailPage({ params }: RouteSheetDetailPageProps) {
  const { id } = await params
  let routeSheet: Awaited<ReturnType<typeof getRouteSheet>>
  let settings: Awaited<ReturnType<typeof db.storeSettings.findFirst>>
  let depots: Awaited<ReturnType<typeof getDepots>>
  let vehicles: Awaited<ReturnType<typeof getVehicles>>

  try {
    ;[routeSheet, settings, depots, vehicles] = await Promise.all([
      getRouteSheet(id),
      db.storeSettings.findFirst(),
      getDepots(),
      getVehicles()
    ])
  } catch (error) {
    console.error("[ADMIN_ROUTE_SHEET_DETAIL_LOAD_ERROR]", {
      routeSheetId: id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }

  if (!routeSheet) {
    console.warn("[ADMIN_ROUTE_SHEET_DETAIL_NOT_FOUND]", { routeSheetId: id })
    notFound()
  }

  const whatsappMessage = settings?.whatsappPreArrivalMessage || ""

  const statusLabels: Record<string, string> = {
    DRAFT: "Borrador",
    IN_PREPARATION: "En preparación",
    IN_DELIVERY: "En reparto",
    COMPLETED: "Finalizada",
    CANCELLED: "Cancelada",
  }
  const routeItems = routeSheet.items as RouteSheetOrderCardItem[]

  const deliveredCount = routeItems.filter(
    (item) => item.deliveryOutcome === "DELIVERED"
  ).length
  const notDeliveredCount = routeItems.filter(
    (item) => item.deliveryOutcome === "NOT_DELIVERED"
  ).length

  // Serializar datos para pasar a componentes cliente
  const serializedRouteSheet = {
    ...routeSheet,
    date: typeof routeSheet.date === 'string' ? routeSheet.date : (routeSheet.date as Date).toISOString(),
    createdAt: typeof routeSheet.createdAt === 'string' ? routeSheet.createdAt : (routeSheet.createdAt as Date).toISOString(),
    updatedAt: typeof routeSheet.updatedAt === 'string' ? routeSheet.updatedAt : (routeSheet.updatedAt as Date).toISOString(),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/routes" className="text-sm text-muted-foreground hover:underline">
            ← Volver a Hojas de Ruta
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{routeSheet.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>Fecha: {new Date(routeSheet.date).toLocaleDateString("es-AR")}</span>
            <span>•</span>
            <span>Creada por: {routeSheet.createdBy?.name || "Sistema"}</span>
            <span>•</span>
            <span>{routeItems.length} pedidos</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {statusLabels[routeSheet.status]}
          </Badge>
          <RouteSheetActions routeSheet={serializedRouteSheet} />
        </div>
      </div>

      {/* Stats */}
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

      {/* Notes */}
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

      {/* Tabs */}
      <Tabs defaultValue="preparation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preparation">Preparación</TabsTrigger>
          <TabsTrigger value="delivery">Reparto</TabsTrigger>
        </TabsList>

        {/* Vista de Preparación */}
        <TabsContent value="preparation" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ordene los pedidos y prepare la mercadería. Marque los faltantes o utilice optimización de ruteo.
          </p>
          <SortableRouteItems 
            items={routeSheet.items}
            whatsappMessage={whatsappMessage}
            storeName={settings?.storeName || "Mi Tienda"}
            depots={depots}
            vehicles={vehicles}
            routeSheet={routeSheet}
          />
        </TabsContent>

        {/* Vista de Reparto */}
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
                storeName={settings?.storeName || "Mi Tienda"}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
