"use server"

import { db } from "@/lib/db"
import { auth, canAccessAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// ============================================
// VEHICLES
// ============================================

export async function getVehicles() {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    throw new Error("No autorizado")
  }

  return db.vehicle.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createVehicle(data: { name: string; licensePlate?: string; capacity?: number }) {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { success: false, error: "No autorizado" }
  }

  try {
    const vehicle = await db.vehicle.create({
      data: {
        name: data.name,
        licensePlate: data.licensePlate || null,
        capacity: data.capacity || null,
        isActive: true
      }
    })
    
    revalidatePath("/admin/logistics/vehicles")
    return { success: true, vehicle }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateVehicle(id: string, data: { name?: string; licensePlate?: string; capacity?: number; isActive?: boolean }) {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { success: false, error: "No autorizado" }
  }

  try {
    const vehicle = await db.vehicle.update({
      where: { id },
      data
    })
    
    revalidatePath("/admin/logistics/vehicles")
    return { success: true, vehicle }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteVehicle(id: string) {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { success: false, error: "No autorizado" }
  }

  try {
    // Check if used in routes
    const routes = await db.routeSheet.findFirst({
      where: { vehicleId: id }
    })

    if (routes) {
      // Just deactivate if used
      await db.vehicle.update({
        where: { id },
        data: { isActive: false }
      })
      revalidatePath("/admin/logistics/vehicles")
      return { success: true, deactivated: true }
    }

    await db.vehicle.delete({
      where: { id }
    })
    
    revalidatePath("/admin/logistics/vehicles")
    return { success: true, deleted: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// DEPOTS
// ============================================

export async function getDepots() {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    throw new Error("No autorizado")
  }

  return db.depot.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createDepot(data: { name: string; address: any; lat?: number; lng?: number }) {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { success: false, error: "No autorizado" }
  }

  try {
    const depot = await db.depot.create({
      data: {
        name: data.name,
        address: data.address,
        lat: data.lat || null,
        lng: data.lng || null,
        isActive: true
      }
    })
    
    revalidatePath("/admin/logistics/depots")
    return { success: true, depot }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateDepot(id: string, data: { name?: string; address?: any; lat?: number; lng?: number; isActive?: boolean }) {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { success: false, error: "No autorizado" }
  }

  try {
    const depot = await db.depot.update({
      where: { id },
      data
    })
    
    revalidatePath("/admin/logistics/depots")
    return { success: true, depot }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteDepot(id: string) {
  const session = await auth()
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return { success: false, error: "No autorizado" }
  }

  try {
    // Check if used in routes
    const routesStarted = await db.routeSheet.findFirst({
      where: { startDepotId: id }
    })
    const routesEnded = await db.routeSheet.findFirst({
      where: { endDepotId: id }
    })

    if (routesStarted || routesEnded) {
      // Just deactivate if used
      await db.depot.update({
        where: { id },
        data: { isActive: false }
      })
      revalidatePath("/admin/logistics/depots")
      return { success: true, deactivated: true }
    }

    await db.depot.delete({
      where: { id }
    })
    
    revalidatePath("/admin/logistics/depots")
    return { success: true, deleted: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
