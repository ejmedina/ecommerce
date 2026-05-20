import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  parseCartComboConfiguration,
  validateComboCartSelection,
} from "@/lib/cart-combos"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const productId = formData.get("productId") as string
    const variantId = formData.get("variantId") as string || null
    const quantity = parseInt(formData.get("quantity") as string) || 1
    const rawComboConfiguration = formData.get("comboConfiguration")

    if (!productId) {
      return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 })
    }

    const session = await auth()
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("cart_session_id")?.value

    let cart

    if (session?.user?.id) {
      cart = await db.cart.findUnique({
        where: { userId: session.user.id },
      })

      if (!cart) {
        cart = await db.cart.create({
          data: { userId: session.user.id },
        })
      }
    } else {
      cart = sessionId
        ? await db.cart.findUnique({ where: { sessionId } })
        : null

      if (!cart) {
        const newSessionId = crypto.randomUUID()
        cookieStore.set("cart_session_id", newSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        })

        cart = await db.cart.create({
          data: { sessionId: newSessionId },
        })
      }
    }

    const product = await db.product.findUnique({ 
      where: { id: productId },
      include: {
        variants: variantId ? { where: { id: variantId } } : false,
        comboComponents: {
          orderBy: { position: "asc" },
          include: {
            product: {
              include: {
                variants: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      }
    })

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    let selectionSignature: string | null = null
    let comboConfiguration = null

    if (product.isCombo) {
      if (variantId) {
        return NextResponse.json({ error: "Los combos no admiten una variante directa." }, { status: 400 })
      }

      try {
        const parsedConfiguration = parseCartComboConfiguration(rawComboConfiguration)
        const validatedSelection = validateComboCartSelection({
          product,
          rawConfiguration: parsedConfiguration,
          quantity,
        })

        selectionSignature = validatedSelection.selectionSignature
        comboConfiguration = validatedSelection.configuration
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "No se pudo validar el combo." },
          { status: 400 }
        )
      }
    } else {
      // Check stock
      if (variantId) {
        const variant = product.variants[0]
        if (!variant) {
          return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 })
        }
        if (!product.hasPermanentStock && variant.stock < quantity) {
          return NextResponse.json({ error: "No hay suficiente stock" }, { status: 400 })
        }
      } else if (!product.hasPermanentStock && product.stock < quantity) {
        return NextResponse.json({ error: "No hay suficiente stock" }, { status: 400 })
      }
    }

    const existingItem = await db.cartItem.findFirst({
      where: { 
        cartId: cart.id, 
        productId,
        variantId: variantId || null,
        selectionSignature,
      },
    })

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity

      if (product.isCombo) {
        try {
          validateComboCartSelection({
            product,
            rawConfiguration: comboConfiguration,
            quantity: newQuantity,
          })
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "No hay suficiente stock" },
            { status: 400 }
          )
        }
      } else if (variantId) {
        const variant = product.variants[0]
        if (!product.hasPermanentStock && variant.stock < newQuantity) {
          return NextResponse.json({ error: "No hay suficiente stock" }, { status: 400 })
        }
      } else if (!product.hasPermanentStock && newQuantity > product.stock) {
        return NextResponse.json({ error: "No hay suficiente stock" }, { status: 400 })
      }

      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      })
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          comboConfiguration,
          selectionSignature,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding to cart:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
