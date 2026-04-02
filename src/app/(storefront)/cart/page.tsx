import Link from "next/link"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { removeFromCart, updateCartItem } from "@/lib/actions/cart-actions"

export const dynamic = "force-dynamic"

async function getCart() {
  const session = await auth()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("cart_session_id")?.value

  if (session?.user?.id) {
    return db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
            variant: true,
          },
        },
      },
    })
  }

  if (sessionId) {
    return db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
            variant: true,
          },
        },
      },
    })
  }

  return null
}

export default async function CartPage() {
  const cart = await getCart()

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-8">
          Agregá productos para comenzar tu compra
        </p>
        <Button asChild>
          <Link href="/products">Ver productos</Link>
        </Button>
      </div>
    )
  }

  const subtotal = cart.items.reduce((sum: number, item: any) => {
    const itemPrice = item.variant?.price ? Number(item.variant.price) : Number(item.product.price)
    return sum + itemPrice * item.quantity
  }, 0)
  const itemCount = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Carrito ({itemCount})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item: any) => {
            const currentPrice = item.variant?.price ? Number(item.variant.price) : Number(item.product.price)
            
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 shrink-0 rounded-md bg-muted overflow-hidden">
                      {item.product.images[0] ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-medium hover:underline line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant?.title && (
                        <p className="text-sm text-muted-foreground">
                          {item.variant.title}
                        </p>
                      )}
                      {item.product.sku && !item.variant && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.product.sku}
                        </p>
                      )}
                      <p className="font-semibold mt-1">
                        {formatCurrency(currentPrice)}
                      </p>
                    </div>

                  {/* Quantity */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <form action={async () => {
                        "use server"
                        const newQty = Math.max(1, item.quantity - 1)
                        await updateCartItem(item.id, newQty)
                      }}>
                        <Button type="submit" variant="outline" size="icon" className="h-8 w-8">
                          <span>-</span>
                        </Button>
                      </form>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <form action={async () => {
                        "use server"
                        await updateCartItem(item.id, item.quantity + 1)
                      }}>
                        <Button type="submit" variant="outline" size="icon" className="h-8 w-8">
                          <span>+</span>
                        </Button>
                      </form>
                    </div>

                    {/* Remove */}
                    <form action={async () => {
                      "use server"
                      await removeFromCart(item.id)
                    }}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span>Calculado en checkout</span>
              </div>
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">Continuar compra</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
