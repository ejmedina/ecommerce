import Link from "next/link"
import { db } from "@/lib/db"
import { cn, formatCurrency } from "@/lib/utils"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { getStorefrontCategories } from "@/lib/categories"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ category?: string; s?: string }>
}

async function getProducts(params: { category?: string; s?: string }) {
  const where: Record<string, unknown> = { isActive: true }

  if (params.category) {
    where.category = { slug: params.category }
  }
  if (params.s) {
    where.OR = [
      { name: { contains: params.s, mode: "insensitive" } },
      { description: { contains: params.s, mode: "insensitive" } },
    ]
  }

  if (params.s) {
    const products = await db.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { order: "asc" } },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    })
    
    // For searches, show all but sort out-of-stock items at the end
    return products.sort((a, b) => {
      const aInStock = a.stock > 0 || a.hasPermanentStock
      const bInStock = b.stock > 0 || b.hasPermanentStock
      if (aInStock && !bInStock) return -1
      if (!aInStock && bInStock) return 1
      return 0
    })
  } else {
    // For browsing (categories, brands, all), strictly hide out of stock
    where.OR = [
      { stock: { gt: 0 } },
      { hasPermanentStock: true }
    ]
    
    return db.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { order: "asc" } },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }
}

async function getCategories() {
  return getStorefrontCategories()
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const [products, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className={cn(
          "w-full md:w-64 shrink-0",
          params.s && "hidden md:block"
        )}>
          <h2 className="font-semibold mb-4">Categorías</h2>
          <nav className="space-y-2">
            <Link
              href="/products"
              className={`block px-2 py-1 rounded ${
                !params.category ? "bg-muted" : ""
              }`}
            >
              Todos los productos
            </Link>
            {categories.map((category) => (
              <div key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className={`block px-2 py-1 rounded ${
                    params.category === category.slug ? "bg-muted font-medium" : ""
                  }`}
                >
                  {category.name}
                </Link>
                {category.children.length > 0 && (
                  <nav className="ml-4 space-y-1 mt-1">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/products?category=${child.slug}`}
                        className={`block px-2 py-1 text-sm rounded ${
                          params.category === child.slug ? "bg-muted" : ""
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {params.s && (
            <p className="text-muted-foreground mb-4">
              Resultados para "{params.s}"
            </p>
          )}
          
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No se encontraron productos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="group flex flex-col">
                  <Link
                    href={`/products/${product.slug}`}
                    className="block"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                      {product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium truncate">{product.name}</h3>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">
                        {product.category.name}
                      </p>
                    )}
                    <p className="text-lg font-semibold mt-1">
                      {formatCurrency(Number(product.price))}
                    </p>
                  </Link>
                  <div className="mt-auto pt-3">
                    <AddToCartButton
                      productId={product.id}
                      productName={product.name}
                      className="w-full"
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
