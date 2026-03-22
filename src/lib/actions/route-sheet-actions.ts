"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

// ============================================
// CREATE ROUTE SHEET
// ============================================

export async function createRouteSheet(
  name: string,
  orderIds: string[],
  date: Date
) {
  try {
    // Obtener usuario de la sesión
    const session = await auth()
    let createdById = "system"
    
    if (session?.user?.id) {
      createdById = session.user.id
    } else {
      // Buscar un usuario admin para usar como fallback
      const adminUser = await db.user.findFirst({
        where: { role: { in: ["ADMIN", "OWNER", "SUPERADMIN"] } }
      })
      if (adminUser) {
        createdById = adminUser.id
      }
    }

    // Obtener pedidos - el operador decide cuáles incluir (sin filtro de estado)
    const orders = await db.order.findMany({
      where: { 
        id: { in: orderIds },
      },
    })

    if (orders.length === 0) {
      return { error: "No se encontraron pedidos para crear la hoja de ruta" }
    }

    const routeSheet = await db.routeSheet.create({
      data: {
        name,
        date,
        createdById,
        items: {
          create: orders.map((order, index) => ({
            orderId: order.id,
            position: index + 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            order: {
              include: {
                user: { select: { name: true, phone: true } },
              },
            },
          },
        },
      },
    })

    revalidatePath("/admin/orders")
    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${routeSheet.id}`)

    return { routeSheet }
  } catch (error) {
    console.error("Create route sheet error:", error)
    return { error: "Error al crear la hoja de ruta" }
  }
}

// ============================================
// UPDATE ROUTE SHEET STATUS
// ============================================

export async function updateRouteSheetStatus(
  routeSheetId: string,
  status: "DRAFT" | "IN_PREPARATION" | "IN_DELIVERY" | "COMPLETED" | "CANCELLED"
) {
  try {
    await db.routeSheet.update({
      where: { id: routeSheetId },
      data: { status },
    })

    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Update route sheet status error:", error)
    return { error: "Error al actualizar el estado" }
  }
}

// ============================================
// UPDATE ROUTE SHEET
// ============================================

export async function updateRouteSheet(
  routeSheetId: string,
  data: { name?: string; date?: Date; notes?: string }
) {
  try {
    const updateData: Prisma.RouteSheetUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.date !== undefined) updateData.date = data.date
    if (data.notes !== undefined) updateData.notes = data.notes

    await db.routeSheet.update({
      where: { id: routeSheetId },
      data: updateData,
    })

    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Update route sheet error:", error)
    return { error: "Error al actualizar la hoja de ruta" }
  }
}

// ============================================
// ADD ORDERS TO ROUTE SHEET
// ============================================

export async function addOrdersToRouteSheet(routeSheetId: string, orderIds: string[]) {
  try {
    // Obtener la última posición
    const lastItem = await db.routeSheetItem.findFirst({
      where: { routeSheetId },
      orderBy: { position: "desc" },
    })
    const startPosition = lastItem ? lastItem.position + 1 : 1

    // Verificar qué pedidos ya están en la hoja de ruta
    const existingItems = await db.routeSheetItem.findMany({
      where: { routeSheetId },
      select: { orderId: true },
    })
    const existingOrderIds = new Set(existingItems.map((item) => item.orderId))

    // Filtrar pedidos nuevos
    const newOrderIds = orderIds.filter((id) => !existingOrderIds.has(id))

    if (newOrderIds.length === 0) {
      return { error: "Los pedidos seleccionados ya están en la hoja de ruta" }
    }

    // Crear nuevos items
    await db.routeSheetItem.createMany({
      data: newOrderIds.map((orderId, index) => ({
        routeSheetId,
        orderId,
        position: startPosition + index,
      })),
    })

    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Add orders to route sheet error:", error)
    return { error: "Error al agregar pedidos" }
  }
}

// ============================================
// REMOVE ORDER FROM ROUTE SHEET
// ============================================

export async function removeOrderFromRouteSheet(routeSheetItemId: string) {
  try {
    const item = await db.routeSheetItem.findUnique({
      where: { id: routeSheetItemId },
      include: { routeSheet: true },
    })

    if (!item) {
      return { error: "Item no encontrado" }
    }

    await db.routeSheetItem.delete({
      where: { id: routeSheetItemId },
    })

    // Reordenar posiciones
    const remainingItems = await db.routeSheetItem.findMany({
      where: { routeSheetId: item.routeSheetId },
      orderBy: { position: "asc" },
    })

    for (let i = 0; i < remainingItems.length; i++) {
      await db.routeSheetItem.update({
        where: { id: remainingItems[i].id },
        data: { position: i + 1 },
      })
    }

    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${item.routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Remove order from route sheet error:", error)
    return { error: "Error al remover el pedido" }
  }
}

// ============================================
// REORDER ROUTE SHEET ITEMS
// ============================================

export async function reorderRouteSheetItem(itemId: string, direction: "up" | "down") {
  try {
    const item = await db.routeSheetItem.findUnique({
      where: { id: itemId },
      include: { routeSheet: { include: { items: { orderBy: { position: "asc" } } } } },
    })

    if (!item) return { error: "Item no encontrado" }

    const items = item.routeSheet.items
    const currentIndex = items.findIndex((i) => i.id === itemId)

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

    revalidatePath(`/admin/routes/${item.routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Reorder error:", error)
    return { error: "Error al reordenar" }
  }
}

// ============================================
// REGISTER MISSING ITEM (FALTANTE)
// ============================================

export async function registerMissingItem(
  routeSheetItemId: string,
  productId: string,
  quantityMissing: number,
  notes?: string
) {
  try {
    // Verificar que el item existe
    const item = await db.routeSheetItem.findUnique({
      where: { id: routeSheetItemId },
    })

    if (!item) {
      return { error: "Item de hoja de ruta no encontrado" }
    }

    // Crear o actualizar faltante
    const missing = await db.routeSheetItemMissing.upsert({
      where: {
        routeSheetItemId_productId: {
          routeSheetItemId,
          productId,
        },
      },
      update: {
        quantityMissing,
        notes,
        markedAt: new Date(),
      },
      create: {
        routeSheetItemId,
        productId,
        quantityMissing,
        notes,
      },
    })

    revalidatePath(`/admin/routes/${item.routeSheetId}`)

    return { missing }
  } catch (error) {
    console.error("Register missing item error:", error)
    return { error: "Error al registrar faltante" }
  }
}

// ============================================
// REMOVE MISSING ITEM
// ============================================

export async function removeMissingItem(missingId: string) {
  try {
    const missing = await db.routeSheetItemMissing.findUnique({
      where: { id: missingId },
      include: { routeSheetItem: true },
    })

    if (!missing) {
      return { error: "Faltante no encontrado" }
    }

    await db.routeSheetItemMissing.delete({
      where: { id: missingId },
    })

    revalidatePath(`/admin/routes/${missing.routeSheetItem.routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Remove missing item error:", error)
    return { error: "Error al remover faltante" }
  }
}

// ============================================
// SET DELIVERY RESULT
// ============================================

export async function setDeliveryResult(
  routeSheetItemId: string,
  status: "DELIVERED" | "NOT_DELIVERED",
  failureReason?: "CUSTOMER_NOT_HOME" | "WRONG_ADDRESS" | "INACCESSIBLE_LOCATION",
  notes?: string
) {
  try {
    const item = await db.routeSheetItem.findUnique({
      where: { id: routeSheetItemId },
    })

    if (!item) {
      return { error: "Item de hoja de ruta no encontrado" }
    }

    // Crear o actualizar resultado de entrega
    const result = await db.deliveryResult.upsert({
      where: { routeSheetItemId },
      update: {
        status,
        failureReason: status === "NOT_DELIVERED" ? failureReason : null,
        notes,
        deliveredAt: status === "DELIVERED" ? new Date() : null,
      },
      create: {
        routeSheetItemId,
        status,
        failureReason: status === "NOT_DELIVERED" ? failureReason : null,
        notes,
        deliveredAt: status === "DELIVERED" ? new Date() : null,
      },
    })

    revalidatePath(`/admin/routes/${item.routeSheetId}`)

    return { result }
  } catch (error) {
    console.error("Set delivery result error:", error)
    return { error: "Error al registrar resultado de entrega" }
  }
}

// ============================================
// Helper para serializar route sheet (convertir Decimal a number)
// ============================================

function serializeRouteSheet(rs: any) {
  return {
    ...rs,
    date: rs.date.toISOString(),
    createdAt: rs.createdAt.toISOString(),
    updatedAt: rs.updatedAt.toISOString(),
    items: rs.items.map((item: any) => ({
      ...item,
      order: {
        ...item.order,
        total: Number(item.order.total),
        subtotal: Number(item.order.subtotal),
        shippingCost: Number(item.order.shippingCost),
        taxAmount: Number(item.order.taxAmount),
        discountAmount: Number(item.order.discountAmount),
        createdAt: item.order.createdAt.toISOString(),
        updatedAt: item.order.updatedAt.toISOString(),
        paidAt: item.order.paidAt?.toISOString() || null,
        shippedAt: item.order.shippedAt?.toISOString() || null,
        deliveredAt: item.order.deliveredAt?.toISOString() || null,
        cancelledAt: item.order.cancelledAt?.toISOString() || null,
        items: item.order.items.map((oi: any) => ({
          ...oi,
          price: Number(oi.price),
          total: Number(oi.total),
        })),
      },
      deliveryResult: item.deliveryResult ? {
        ...item.deliveryResult,
        deliveredAt: item.deliveryResult.deliveredAt?.toISOString() || null,
      } : null,
    })),
  }
}

// ============================================
// GET ROUTE SHEET (for detail page)
// ============================================

export async function getRouteSheet(routeSheetId: string) {
  try {
    const routeSheet = await db.routeSheet.findUnique({
      where: { id: routeSheetId },
      include: {
        createdBy: { select: { name: true, email: true } },
        items: {
          orderBy: { position: "asc" },
          include: {
            order: {
              include: {
                user: { select: { name: true, email: true, phone: true } },
                items: {
                  include: {
                    product: { select: { id: true, name: true, sku: true } },
                  },
                },
              },
            },
            missingItems: true,
            deliveryResult: true,
          },
        },
      },
    })

    if (!routeSheet) return null

    return serializeRouteSheet(routeSheet)
  } catch (error) {
    console.error("Get route sheet error:", error)
    return null
  }
}

// ============================================
// GET ALL ROUTE SHEETS
// ============================================

export async function getRouteSheets() {
  try {
    const routeSheets = await db.routeSheet.findMany({
      include: {
        createdBy: { select: { name: true } },
        items: {
          include: {
            deliveryResult: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return routeSheets
  } catch (error) {
    console.error("Get route sheets error:", error)
    return []
  }
}
