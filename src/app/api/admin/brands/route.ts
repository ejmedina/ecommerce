import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"
import { requireAuth } from "@/lib/admin-auth"

export async function GET() {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const brands = await db.brand.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error("Brands GET error:", error)
    return NextResponse.json({ error: "Error al obtener marcas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await req.json()
    const { name, logo, isActive } = body

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const slug = slugify(name)

    // Check if slug exists
    const existing = await db.brand.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    const brand = await db.brand.create({
      data: {
        name,
        slug: finalSlug,
        logo,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Brand create error:", error)
    return NextResponse.json({ error: "Error al crear marca" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await req.json()
    const { id, name, logo, isActive } = body

    if (!id || !name) {
      return NextResponse.json({ error: "ID y nombre son requeridos" }, { status: 400 })
    }

    const brand = await db.brand.update({
      where: { id },
      data: {
        name,
        logo,
        isActive,
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Brand update error:", error)
    return NextResponse.json({ error: "Error al actualizar marca" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    // Check if brand has products
    const productCount = await db.product.count({ where: { brandId: id } })
    if (productCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar. Hay ${productCount} productos usando esta marca.` 
      }, { status: 400 })
    }

    await db.brand.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Brand delete error:", error)
    return NextResponse.json({ error: "Error al eliminar marca" }, { status: 500 })
  }
}
