import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { getCartState } from "@/lib/cart"
import { CheckoutSteps } from "@/components/checkout-steps"
import { calculateCartPricing, type CartPricingItem } from "@/lib/pricing"

type PaymentMethodsConfig = Record<string, {
  isActive: boolean
  label: string
  description: string
}>

export const dynamic = "force-dynamic"

async function getCart() {
  const session = await auth()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("cart_session_id")?.value

  return getCartState(session?.user?.id, sessionId)
}

async function getSettings() {
  let settings = await db.storeSettings.findFirst({
    include: { deliveryScheduleRules: { orderBy: { position: "asc" } } },
  })
  if (!settings) {
    settings = await db.storeSettings.create({
      data: {
        storeName: "Mi Tienda",
        freeShippingMin: 0,
        fixedShippingCost: 0,
      },
      include: { deliveryScheduleRules: { orderBy: { position: "asc" } } },
    })
  }
  // Convert Decimal to plain numbers to avoid hydration errors
  return {
    freeShippingMin: Number(settings.freeShippingMin),
    fixedShippingCost: Number(settings.fixedShippingCost),
    bankAccount: settings.bankAccount,
    shippingConfig: settings.shippingConfig,
    paymentMethods: settings.paymentMethods as PaymentMethodsConfig | null,
    minShippingOrderAmount: Number(settings.minShippingOrderAmount) || 0,
    storePickupEnabled: settings.storePickupEnabled,
    deliverySchedulingEnabled: settings.deliverySchedulingEnabled,
    deliveryDateOptionsLimit: settings.deliveryDateOptionsLimit,
    deliveryScheduleRules: settings.deliveryScheduleRules.map((rule) => ({
      id: rule.id,
      shippingZoneId: rule.shippingZoneId,
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
      cutoffDaysBefore: rule.cutoffDaysBefore,
      cutoffTime: rule.cutoffTime,
      isActive: rule.isActive,
    })),
    timeZone: settings.timeZone,
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
  const pricingItems: CartPricingItem[] = hasCart
    ? cart.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        productId: item.product.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.price),
          discountType: item.product.discountType,
          discountConfig: item.product.discountConfig,
        },
        variant: item.variant ? {
          price: item.variant.price,
        } : null,
      }))
    : []
  const pricingResult = hasCart ? calculateCartPricing(pricingItems) : null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Finalizar compra</h1>
      
      {hasCart && pricingResult ? (
        <CheckoutSteps
          cart={cart}
          settings={settings}
          pricingResult={pricingResult}
          user={session?.user || null}
          addresses={addresses}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
          <Link href="/products" className="text-primary hover:underline">
            Ver productos
          </Link>
        </div>
      )}
    </div>
  )
}
