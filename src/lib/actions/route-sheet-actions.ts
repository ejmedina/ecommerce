"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createRouteSheet(orderIds: string[]) {
  try {
    const orders = await db.order.findMany({
      where: { id: { in: orderIds } },
    })

    if (orders.length === 0) {
      return { error: "No se seleccionaron pedidos" }
    }

    const routeSheet = await db.routeSheet.create({
      data: {
        name: `Ruta ${new Date().toLocaleDateString("es-AR")}`,
        date: new Date(),
        createdById: orders[0].userId,
        items: {
          create: orders.map((order, index) => ({
            orderId: order.id,
            position: index + 1,
          })),
        },
      },
    })

    revalidatePath("/admin/orders")
    revalidatePath("/admin/orders/route-sheet")

    return { routeSheetId: routeSheet.id }
  } catch (error) {
    console.error("Create route sheet error:", error)
    return { error: "Error al crear la hoja de ruta" }
  }
}

export async function reorderRouteSheetItem(itemId: string, direction: "up" | "down") {
  try {
    const item = await db.routeSheetItem.findUnique({
      where: { id: itemId },
      include: { routeSheet: { include: { items: { orderBy: { position: "asc" } } } } },
    })

    if (!item) return { error: "Item no encontrado" }

    const items = item.routeSheet.items
    const currentIndex = items.findIndex(i => i.id === itemId)

    if (direction === "up" && currentIndex === 0) return { success: true }
    if (direction === "down" && currentIndex === items.length - 1) return { success: true }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    const swapItem = items[swapIndex]

    await db.routeSheetItem.update({
      where: { id: item.id },
      data: { position: swapItem.position },
    })
    await db.routeSheetItem.update({
      where: { id: swapItem.id },
      data: { position: item.position },
    })

    revalidatePath(`/admin/orders/route-sheet/${item.routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Reorder error:", error)
    return { error: "Error al reordenar" }
  }
}
