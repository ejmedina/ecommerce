"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

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
        cancelledAt: item.order.cancelledAt?.toISOString() || null,
        items: item.order.items.map((oi: any) => ({
          ...oi,
          price: Number(oi.price),
          unitTotal: Number(oi.unitTotal),
        })),
      },
    })),
  }
}

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
    
    // Verificar que hay sesión activa
    if (!session?.user?.id) {
      return { error: "AUTH_REQUIRED", message: "Debes iniciar sesión para crear una hoja de ruta" }
    }
    
    // Verificar que el usuario tiene rol de admin
    const userRole = (session.user as any).role
    if (!userRole || !["ADMIN", "OWNER", "SUPERADMIN"].includes(userRole)) {
      return { error: "UNAUTHORIZED", message: "No tienes permisos para crear hojas de ruta" }
    }
    
    const createdById = session.user.id

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
                items: true,
              },
            },
          },
        },
      },
    })

    revalidatePath("/admin/orders")
    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${routeSheet.id}`)

    // Serializar para evitar errores de Decimal en el cliente
    const serializedRouteSheet = serializeRouteSheet(routeSheet)

    return { routeSheet: serializedRouteSheet }
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
// REGISTER MISSING ITEM (FALTANTE) - Simplified
// Now using OrderItem fields directly
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

    // Actualizar el OrderItem directamente con los campos de faltante
    const orderItem = await db.orderItem.updateMany({
      where: {
        orderId: item.orderId,
        productId: productId,
      },
      data: {
        quantityMissing: quantityMissing,
        missingReason: notes || null,
        // Si hay faltante, quantityFulfilled es la diferencia
        quantityFulfilled: undefined, // Se calcula en base a quantityOrdered - quantityMissing
      },
    })

    revalidatePath(`/admin/routes/${item.routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Register missing item error:", error)
    return { error: "Error al registrar faltante" }
  }
}

// ============================================
// MARK ORDER AS DELIVERED/NOT DELIVERED - Simplified
// Now using RouteSheetItem deliveryOutcome field
// ============================================

export async function setDeliveryOutcome(
  routeSheetItemId: string,
  outcome: "DELIVERED" | "NOT_DELIVERED",
  failureReason?: "CUSTOMER_NOT_HOME" | "WRONG_ADDRESS" | "INACCESSIBLE_LOCATION" | "CUSTOMER_REFUSED" | "OTHER",
  notes?: string
) {
  try {
    const item = await db.routeSheetItem.findUnique({
      where: { id: routeSheetItemId },
    })

    if (!item) {
      return { error: "Item de hoja de ruta no encontrado" }
    }

    // Actualizar el RouteSheetItem con el resultado de entrega
    await db.routeSheetItem.update({
      where: { id: routeSheetItemId },
      data: {
        deliveryOutcome: outcome,
        deliveryFailureReason: outcome === "NOT_DELIVERED" ? failureReason : null,
        deliveryNotes: notes,
        deliveredAt: outcome === "DELIVERED" ? new Date() : null,
      },
    })

    // También actualizar el OrderStatus si es necesario
    const orderStatus = outcome === "DELIVERED" ? "DELIVERED" : "NOT_DELIVERED"
    await db.order.update({
      where: { id: item.orderId },
      data: { orderStatus },
    })

    revalidatePath(`/admin/routes/${item.routeSheetId}`)

    return { success: true }
  } catch (error) {
    console.error("Set delivery outcome error:", error)
    return { error: "Error al registrar resultado de entrega" }
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
        items: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return routeSheets
  } catch (error) {
    console.error("Get route sheets error:", error)
    return []
  }
}

// ============================================
// BATCH REORDER ROUTE SHEET ITEMS (For Drag & Drop)
// ============================================

export async function reorderRouteSheetItemsBatch(routeSheetId: string, itemIdsInOrder: string[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "No autorizado" }

    // Execute all updates in a transaction for data integrity
    await db.$transaction(
      itemIdsInOrder.map((id, index) => 
        db.routeSheetItem.update({
          where: { id },
          data: { position: index + 1 }
        })
      )
    )

    revalidatePath(`/admin/routes/${routeSheetId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Batch reorder error:", error)
    return { success: false, error: error.message }
  }
}

// ============================================
// GEOCODING UTILITY
// ============================================

export async function geocodeAddress(addressData: any) {
  // If we already have coordinates from the user's saved address or previous geocoding, use them.
  if (addressData.lat && addressData.lng) {
    return { lat: addressData.lat, lng: addressData.lng }
  }

  // Construct query string
  const queryParts = [addressData.street, addressData.number, addressData.city, addressData.state, "Argentina"]
  const query = queryParts.filter(Boolean).join(", ")

  try {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY
    if (!apiKey) {
      console.warn("No ORS API Key configured")
      return null
    }

    const res = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&size=1`)
    if (!res.ok) throw new Error("Error fetching geocode")
    const data = await res.json()

    if (data.features && data.features.length > 0) {
      // GeoJSON responses have coordinates as [longitude, latitude]
      const coords = data.features[0].geometry.coordinates
      return { lng: coords[0], lat: coords[1] }
    }
    return null
  } catch (e) {
    console.error("Geocoding failed for address:", query, e)
    return null
  }
}

// ============================================
// LOGISTICS: AUTO-OPTIMIZE ROUTE (TSP) via ORS
// ============================================

export async function optimizeRouteOrder(routeSheetId: string, startDepotId?: string | null, endDepotId?: string | null, vehicleId?: string | null) {
  try {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY
    if (!apiKey) {
      return { success: false, error: "La API Key de OpenRouteService no está configurada en .env" }
    }

    // 1. Fetch Route Sheet, Items and Orders
    const routeSheet = await db.routeSheet.findUnique({
      where: { id: routeSheetId },
      include: {
        items: {
          include: { order: true }
        }
      }
    })

    if (!routeSheet || routeSheet.items.length === 0) {
      return { success: false, error: "La hoja de ruta está vacía." }
    }

    // 2. Resolve Depots (Start / End)
    let startDepot = null
    let endDepot = null

    if (startDepotId) {
      startDepot = await db.depot.findUnique({ where: { id: startDepotId } })
    }
    if (endDepotId) {
      endDepot = await db.depot.findUnique({ where: { id: endDepotId } })
    }

    // Update the route sheet with the selected logistics params
    await db.routeSheet.update({
      where: { id: routeSheetId },
      data: {
        startDepotId: startDepotId || null,
        endDepotId: endDepotId || null,
        vehicleId: vehicleId || null
      }
    })

    // 3. Build VROOM / Optimization Payload
    // Format: https://openrouteservice.org/dev/#/api-docs/optimization/post
    
    const jobs = []
    
    for (const item of routeSheet.items) {
      let shippingAddress = item.order.shippingAddress as any
      let coords = await geocodeAddress(shippingAddress)

      if (!coords) {
        return { success: false, error: `No se pudieron obtener coordenadas para el pedido #${item.order.orderNumber}` }
      }

      // VALIDATION: Check if coordinates are reasonably near Argentina/South America 
      // Prevents "Unfound route" errors from ORS when point falls in the ocean.
      if (coords.lat > -10 || coords.lat < -56 || coords.lng > -30 || coords.lng < -76) {
        return { 
          success: false, 
          error: `Las coordenadas para el pedido #${item.order.orderNumber} están fuera de rango (${coords.lat}, ${coords.lng}). Corrija la dirección o las coordenadas manualmente en el detalle del pedido.` 
        }
      }

      // Persist geocoded coordinates back to the order shipping address to save API calls in future
      if (!shippingAddress.lat || !shippingAddress.lng) {
        shippingAddress.lat = coords.lat
        shippingAddress.lng = coords.lng
        await db.order.update({
          where: { id: item.order.id },
          data: { shippingAddress }
        })
      }

      jobs.push({
        id: parseInt(item.id.replace(/\D/g, '').slice(-8)) || Math.floor(Math.random() * 1000000), // VROOM needs numeric IDs, create a stable hash or fallback
        mapped_id: item.id, // Store string id locally
        location: [coords.lng, coords.lat],
        service: 300 // 5 minutes service time per delivery
      })
    }

    const vehicleObj: any = {
      id: 1,
      profile: "driving-car",
    }

    if (startDepot && startDepot.lng && startDepot.lat) {
      vehicleObj.start = [startDepot.lng, startDepot.lat]
    } else if (jobs.length > 0) {
      vehicleObj.start = jobs[0].location
    }

    if (endDepot && endDepot.lng && endDepot.lat) {
      vehicleObj.end = [endDepot.lng, endDepot.lat]
    }

    const payload = {
      jobs: jobs.map(({mapped_id, ...rest}) => rest),
      vehicles: [vehicleObj]
    }

    // 4. Call ORS Optimization
    const res = await fetch(`https://api.openrouteservice.org/optimization`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errText = await res.text()
      let errData
      try { errData = JSON.parse(errText) } catch (e) {}
      
      console.error("ORS optimization failed:", {
        status: res.status,
        error: errData || errText,
        payloadSent: JSON.stringify(payload)
      })

      const errorMessage = errData?.error?.message || errData?.message || "Error en el servicio de ruteo"
      return { 
        success: false, 
        error: `ORS Error: ${errorMessage}. Verifique las direcciones y la configuración.` 
      }
    }

    const data = await res.json()

    if (data.code !== 0 || !data.routes || data.routes.length === 0) {
      return { success: false, error: "No se encontró una ruta óptima." }
    }

    // 5. Update positions based on route steps
    const steps = data.routes[0].steps
    let currentPosition = 1

    const updates = []
    for (const step of steps) {
      if (step.type === 'job') {
        const originalJobId = step.job
        const originalJob = jobs.find(j => j.id === originalJobId)
        if (originalJob) {
          updates.push(
            db.routeSheetItem.update({
              where: { id: originalJob.mapped_id },
              data: { position: currentPosition }
            })
          )
          currentPosition++
        }
      }
    }

    await db.$transaction(updates)
    revalidatePath(`/admin/routes/${routeSheetId}`)

    return { success: true }
  } catch (error: any) {
    console.error("Optimize Route Error:", error)
    return { success: false, error: error.message }
  }
}
