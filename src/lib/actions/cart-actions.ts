"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function getOrCreateCart() {
  const session = await auth()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("cart_session_id")?.value

  // Check if user exists in database before creating cart with userId
  if (session?.user?.id) {
    const userExists = await db.user.findUnique({ 
      where: { id: session.user.id },
      select: { id: true }
    })
    
    if (userExists) {
      // Logged in user with valid account - use their cart
      let cart = await db.cart.findUnique({
        where: { userId: session.user.id },
        include: {
          items: {
            include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } },
          },
        },
      })

      if (!cart) {
        cart = await db.cart.create({
          data: { userId: session.user.id },
          include: {
            items: {
              include: { product: { include: { images: true } } },
            },
          },
        })
      }

      return cart
    }
    // User doesn't exist in DB, fall through to guest cart
  }

  // Guest user - use session cart
  let cart = sessionId
    ? await db.cart.findUnique({
        where: { sessionId },
        include: {
          items: {
            include: { product: { include: { images: true } } },
          },
        },
      })
    : null

  if (!cart) {
    const newSessionId = crypto.randomUUID()
    cookieStore.set("cart_session_id", newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    cart = await db.cart.create({
      data: { sessionId: newSessionId },
      include: {
        items: {
          include: { product: { include: { images: true } } },
        },
      },
    })
  }

  return cart
}

export async function addToCart(formData: FormData) {
  const productId = formData.get("productId") as string
  const variantId = formData.get("variantId") as string || null
  const quantity = parseInt(formData.get("quantity") as string) || 1

  // Get product with specific variant if provided
  const product = await db.product.findUnique({ 
    where: { id: productId },
    include: {
      variants: variantId ? { where: { id: variantId } } : false
    }
  })

  if (!product) {
    return { error: "Producto no encontrado" }
  }

  // Check stock based on variant or product
  if (variantId) {
    const variant = product.variants[0]
    if (!variant) return { error: "Variante no encontrada" }
    if (variant.stock < quantity) {
      return { error: "No hay suficiente stock de esta variante" }
    }
  } else {
    if (!product.hasPermanentStock && product.stock < quantity) {
      return { error: "No hay suficiente stock" }
    }
  }

  const cart = await getOrCreateCart()

  // Check if item already exists with the same variant
  const existingItem = await db.cartItem.findFirst({
    where: { 
      cartId: cart.id, 
      productId,
      variantId: variantId || null
    },
  })

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity
    
    // Check stock for update
    if (variantId) {
      const variant = product.variants[0]
      if (variant.stock < newQuantity) {
        return { error: "No hay suficiente stock de esta variante" }
      }
    } else if (!product.hasPermanentStock && newQuantity > product.stock) {
      return { error: "No hay suficiente stock" }
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
      },
    })
  }

  redirect("/cart")
}

export async function updateCartItem(itemId: string, quantity: number) {
  if (quantity < 1) {
    return removeFromCart(itemId)
  }

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { 
      product: true,
      variant: true 
    },
  })

  if (!item) {
    return { error: "Item no encontrado" }
  }

  // Stock check
  if (item.variantId) {
    if (item.variant!.stock < quantity) {
      return { error: `No hay suficiente stock de ${item.variant!.title}` }
    }
  } else {
    if (!item.product.hasPermanentStock && quantity > item.product.stock) {
      return { error: "No hay suficiente stock" }
    }
  }

  await db.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  })

  return { success: true }
}

export async function removeFromCart(itemId: string) {
  await db.cartItem.delete({ where: { id: itemId } })
  return { success: true }
}

export async function clearCart() {
  const session = await auth()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("cart_session_id")?.value

  if (session?.user?.id) {
    await db.cartItem.deleteMany({
      where: { cart: { userId: session.user.id } },
    })
  } else if (sessionId) {
    await db.cartItem.deleteMany({
      where: { cart: { sessionId } },
    })
  }

  return { success: true }
}

export async function getCart() {
  return getOrCreateCart()
}

export async function getCartTotals(cart: { items: any[] }) {
  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.variant?.price ? Number(item.variant.price) : Number(item.product.price)
    return sum + price * item.quantity
  }, 0)

  return { subtotal, itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0) }
}
