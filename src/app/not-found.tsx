import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Home, Search } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "No encontramos esa página, pero podés seguir comprando en la tienda.",
}

type RecommendedProduct = {
  id: string
  name: string
  slug: string
  price: Prisma.Decimal
  comparePrice: Prisma.Decimal | null
  category: { name: string } | null
  images: { url: string; alt: string | null }[]
}

async function getStoreSettings() {
  try {
    return await db.storeSettings.findFirst({
      select: {
        logo: true,
        logoWidth: true,
        logoHeight: true,
        storeName: true,
      },
    })
  } catch (error) {
    console.error("Failed to load 404 store settings:", error)
    return null
  }
}

async function getRecommendedProducts(): Promise<RecommendedProduct[]> {
  try {
    const bestSellerGroups = await db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          orderStatus: { not: "CANCELLED" },
        },
        product: {
          isActive: true,
          OR: [{ hasPermanentStock: true }, { stock: { gt: 0 } }],
        },
      },
      _sum: {
        quantityOrdered: true,
      },
      orderBy: {
        _sum: {
          quantityOrdered: "desc",
        },
      },
      take: 4,
    })

    if (bestSellerGroups.length > 0) {
      const products = await db.product.findMany({
        where: {
          id: { in: bestSellerGroups.map((group) => group.productId) },
          isActive: true,
        },
        select: recommendedProductSelect,
      })
      const productById = new Map(products.map((product) => [product.id, product]))

      return bestSellerGroups
        .map((group) => productById.get(group.productId))
        .filter((product): product is RecommendedProduct => Boolean(product))
    }

    return getFallbackProducts()
  } catch (error) {
    console.error("Failed to load 404 recommended products:", error)
    return getFallbackProducts()
  }
}

async function getFallbackProducts() {
  try {
    return await db.product.findMany({
      where: {
        isActive: true,
        OR: [{ hasPermanentStock: true }, { stock: { gt: 0 } }],
      },
      select: recommendedProductSelect,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 4,
    })
  } catch (error) {
    console.error("Failed to load 404 fallback products:", error)
    return []
  }
}

const recommendedProductSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  category: {
    select: {
      name: true,
    },
  },
  images: {
    select: {
      url: true,
      alt: true,
    },
    orderBy: {
      order: "asc",
    },
    take: 1,
  },
} satisfies Prisma.ProductSelect

export default async function NotFound() {
  const [settings, products] = await Promise.all([
    getStoreSettings(),
    getRecommendedProducts(),
  ])
  const storeName = settings?.storeName || process.env.NEXT_PUBLIC_APP_NAME || "El Pan a Tu Casa"

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center">
            {settings?.logo ? (
              <Image
                src={settings.logo}
                alt={storeName}
                width={settings.logoWidth || 200}
                height={settings.logoHeight || 40}
                style={{
                  height: settings.logoHeight ? `${settings.logoHeight}px` : "40px",
                  width: "auto",
                  maxWidth: settings.logoWidth ? `${settings.logoWidth}px` : "200px",
                }}
              />
            ) : (
              <span className="truncate text-xl font-bold">{storeName}</span>
            )}
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/products">
              <Search className="h-4 w-4" />
              Ver productos
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Error 404
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-5xl">
              Esta página ya no está disponible.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Puede ser un link viejo de Google, un favorito del sitio anterior o un producto que cambió de dirección.
              Te dejamos accesos rápidos para seguir comprando en {storeName}.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/products">
                  <Search className="h-4 w-4" />
                  Buscar en la tienda
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Ir al inicio
                </Link>
              </Button>
            </div>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a la tienda
            </Link>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Productos más elegidos</h2>
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            {products.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => {
                  const price = Number(product.price)
                  const comparePrice = product.comparePrice ? Number(product.comparePrice) : null

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="group block rounded-md bg-white p-2 shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.images[0].alt || product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 160px"
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                            Sin imagen
                          </div>
                        )}
                      </div>
                      {product.category ? (
                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          {product.category.name}
                        </p>
                      ) : null}
                      <h3 className="mt-1 min-h-10 text-sm font-medium leading-5 line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold">{formatCurrency(price)}</p>
                        {comparePrice !== null && comparePrice > price ? (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(comparePrice)}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-md bg-white p-6 text-sm text-muted-foreground ring-1 ring-border">
                No pudimos cargar sugerencias en este momento. Probá entrando al catálogo completo.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
