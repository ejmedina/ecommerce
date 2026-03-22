import Link from "next/link"
import { getRouteSheets } from "@/lib/actions/route-sheet-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function RoutesPage() {
  const routeSheets = await getRouteSheets()

  function getStatusBadge(status: string) {
    const variants: Record<string, "secondary" | "warning" | "default" | "success" | "destructive"> = {
      DRAFT: "secondary",
      IN_PREPARATION: "warning",
      IN_DELIVERY: "default",
      COMPLETED: "success",
      CANCELLED: "destructive",
    }
    const labels: Record<string, string> = {
      DRAFT: "Borrador",
      IN_PREPARATION: "En preparación",
      IN_DELIVERY: "En reparto",
      COMPLETED: "Finalizada",
      CANCELLED: "Cancelada",
    }
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 border-gray-200",
      IN_PREPARATION: "bg-yellow-50 border-yellow-200",
      IN_DELIVERY: "bg-blue-50 border-blue-200",
      COMPLETED: "bg-green-50 border-green-200",
      CANCELLED: "bg-red-50 border-red-200",
    }
    return colors[status] || "bg-gray-50"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hojas de Ruta</h1>
        <Link href="/admin/orders">
          <Button variant="outline">← Volver a Pedidos</Button>
        </Link>
      </div>

      {routeSheets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No hay hojas de ruta todavía.</p>
            <p className="text-sm mt-2">
              Ve a <Link href="/admin/orders" className="underline">Pedidos</Link> para crear una.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routeSheets.map((rs) => {
            const deliveredCount = rs.items.filter(i => i.deliveryResult?.status === "DELIVERED").length
            const notDeliveredCount = rs.items.filter(i => i.deliveryResult?.status === "NOT_DELIVERED").length
            const pendingCount = rs.items.length - deliveredCount - notDeliveredCount

            return (
              <Link key={rs.id} href={`/admin/routes/${rs.id}`}>
                <Card className={`hover:bg-muted/50 cursor-pointer transition-colors ${getStatusColor(rs.status)}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{rs.name}</CardTitle>
                      {getStatusBadge(rs.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span>{new Date(rs.date).toLocaleDateString("es-AR")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pedidos:</span>
                        <span>{rs.items.length}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-green-600">✓ Entregados: {deliveredCount}</span>
                        {notDeliveredCount > 0 && (
                          <span className="text-red-600">✗ No entregados: {notDeliveredCount}</span>
                        )}
                        {pendingCount > 0 && (
                          <span className="text-yellow-600">⏳ Pendientes: {pendingCount}</span>
                        )}
                      </div>
                      {rs.notes && (
                        <p className="text-muted-foreground text-xs mt-2 line-clamp-2">
                          {rs.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
