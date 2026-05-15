import { notFound } from "next/navigation"
import { getRouteSheet } from "@/lib/actions/route-sheet-actions"
import { getDepots, getVehicles } from "@/lib/actions/logistics-actions"
import { db } from "@/lib/db"
import { type RouteSheetOrderCardItem } from "./order-card"
import { RouteSheetDetailView } from "./route-sheet-detail-view"

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

  const routeItems = routeSheet.items as RouteSheetOrderCardItem[]

  // Serializar datos para pasar a componentes cliente
  const serializedRouteSheet = {
    ...routeSheet,
    date: typeof routeSheet.date === 'string' ? routeSheet.date : (routeSheet.date as Date).toISOString(),
    createdAt: typeof routeSheet.createdAt === 'string' ? routeSheet.createdAt : (routeSheet.createdAt as Date).toISOString(),
    updatedAt: typeof routeSheet.updatedAt === 'string' ? routeSheet.updatedAt : (routeSheet.updatedAt as Date).toISOString(),
  }

  return (
    <RouteSheetDetailView
      routeSheet={{ ...serializedRouteSheet, items: routeItems }}
      whatsappMessage={whatsappMessage}
      storeName={settings?.storeName || "Mi Tienda"}
      timeZone={settings?.timeZone ?? null}
      depots={depots}
      vehicles={vehicles}
    />
  )
}
