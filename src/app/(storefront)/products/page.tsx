import Link from "next/link"
import { cn } from "@/lib/utils"
import { getStorefrontCategories } from "@/lib/categories"
import { getProductsAction } from "./actions"
import { ProductList } from "./product-list"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ category?: string; s?: string }>
}

async function getCategories() {
  return getStorefrontCategories()
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const [{ products, hasMore }, categories] = await Promise.all([
    getProductsAction({ 
      category: params.category, 
      s: params.s, 
      page: 1, 
      limit: 12 
    }),
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
            <ProductList 
              initialProducts={products} 
              initialHasMore={hasMore}
              category={params.category}
              s={params.s}
            />
          )}
        </div>
      </div>
    </div>
  )
}

