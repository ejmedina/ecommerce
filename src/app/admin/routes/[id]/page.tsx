import Link from "next/link"
import { notFound } from "next/navigation"
import { getRouteSheet } from "@/lib/actions/route-sheet-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { RouteSheetActions } from "./route-sheet-actions"
import { OrderCard } from "./order-card"

interface RouteSheetDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RouteSheetDetailPage({ params }: RouteSheetDetailPageProps) {
  const { id } = await params
  const routeSheet = await getRouteSheet(id)

  if (!routeSheet) {
    notFound()
  }

  const statusLabels: Record<string, string> = {
    DRAFT: "Borrador",
    IN_PREPARATION: "En preparación",
    IN_DELIVERY: "En reparto",
    COMPLETED: "Finalizada",
    CANCELLED: "Cancelada",
  }

  const deliveredCount = routeSheet.items.filter(
    (item: any) => item.deliveryResult?.status === "DELIVERED"
  ).length
  const notDeliveredCount = routeSheet.items.filter(
    (item: any) => item.deliveryResult?.status === "NOT_DELIVERED"
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
            <span>{routeSheet.items.length} pedidos</span>
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
              <p className="text-2xl font-bold">{routeSheet.items.length}</p>
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
                {routeSheet.items.length - deliveredCount - notDeliveredCount}
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
            Ordene los pedidos y prepare la mercadería. Marque los faltantes.
          </p>
          <div className="space-y-4">
            {routeSheet.items.map((item: any, index: number) => (
              <OrderCard
                key={item.id}
                item={item}
                index={index}
                mode="preparation"
                totalItems={routeSheet.items.length}
              />
            ))}
          </div>
        </TabsContent>

        {/* Vista de Reparto */}
        <TabsContent value="delivery" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vista optimizada para usar durante la entrega.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {routeSheet.items.map((item: any) => (
              <OrderCard
                key={item.id}
                item={item}
                index={0}
                mode="delivery"
                totalItems={0}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
