import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { CheckoutSteps } from "@/components/checkout-steps"

export const dynamic = "force-dynamic"

async function getCart() {
  const session = await auth()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("cart_session_id")?.value

  let cart = null
  
  if (session?.user?.id) {
    cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
          },
        },
      },
    })
  } else if (sessionId) {
    cart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
          },
        },
      },
    })
  }

  // Convert Decimal to plain numbers to avoid hydration errors
  if (cart) {
    return {
      ...cart,
      items: cart.items.map(item => ({
        ...item,
        product: {
          ...item.product,
          price: Number(item.product.price),
        }
      }))
    }
  }

  return null
}

async function getSettings() {
  let settings = await db.storeSettings.findFirst()
  if (!settings) {
    settings = await db.storeSettings.create({
      data: {
        storeName: "Mi Tienda",
        freeShippingMin: 0,
        fixedShippingCost: 0,
      },
    })
  }
  // Convert Decimal to plain numbers to avoid hydration errors
  return {
    freeShippingMin: Number(settings.freeShippingMin),
    fixedShippingCost: Number(settings.fixedShippingCost),
    bankAccount: settings.bankAccount,
    shippingConfig: settings.shippingConfig,
    paymentMethods: settings.paymentMethods as any,
  }
}

async function getAddresses(userId: string) {
  const addresses = await db.address.findMany({
    where: { userId },
    orderBy: { isDefault: "desc" },
  })
  return addresses
}

export default async function CheckoutPage() {
  const session = await auth()
  const [cart, settings] = await Promise.all([getCart(), getSettings()])

  // Get saved addresses for logged in user
  let addresses: Awaited<ReturnType<typeof getAddresses>> = []
  if (session?.user?.id) {
    addresses = await getAddresses(session.user.id)
  }

  const hasCart = cart && cart.items.length > 0
  const subtotal = hasCart 
    ? cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)
    : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Finalizar compra</h1>
      
      {hasCart ? (
        <CheckoutSteps
          cart={cart}
          settings={settings}
          subtotal={subtotal}
          user={session?.user || null}
          addresses={addresses}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
          <a href="/products" className="text-primary hover:underline">
            Ver productos
          </a>
        </div>
      )}
    </div>
  )
}
