import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { slugify } from "@/lib/utils"

export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Categories GET error:", error)
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, image, isActive } = body

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const slug = slugify(name)

    // Check if slug exists
    const existing = await db.category.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    const category = await db.category.create({
      data: {
        name,
        slug: finalSlug,
        description,
        image,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Category create error:", error)
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, description, image, isActive } = body

    if (!id || !name) {
      return NextResponse.json({ error: "ID y nombre son requeridos" }, { status: 400 })
    }

    const category = await db.category.update({
      where: { id },
      data: {
        name,
        description,
        image,
        isActive,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Category update error:", error)
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    // Check if category has products
    const productCount = await db.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar. Hay ${productCount} productos usando esta categoría.` 
      }, { status: 400 })
    }

    await db.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Category delete error:", error)
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 })
  }
}
