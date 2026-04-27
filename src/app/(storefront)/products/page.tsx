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
        <aside className="w-full md:w-64 shrink-0">
          <h2 className="font-semibold mb-4 hidden md:block">Categorías</h2>
          
          {/* Mobile Horizontal Categories */}
          <nav className="flex md:hidden overflow-x-auto pb-4 gap-2 no-scrollbar -mx-4 px-4">
            <Link
              href="/products"
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors",
                !params.category 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Todos
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  params.category === category.slug 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Sidebar Categories */}
          <nav className="hidden md:block space-y-2">
            <Link
              href="/products"
              className={cn(
                "block px-2 py-1.5 rounded-md transition-colors",
                !params.category 
                  ? "bg-muted font-medium" 
                  : "hover:bg-muted/50"
              )}
            >
              Todos los productos
            </Link>
            {categories.map((category) => (
              <div key={category.id} className="space-y-1">
                <Link
                  href={`/products?category=${category.slug}`}
                  className={cn(
                    "block px-2 py-1.5 rounded-md transition-colors",
                    params.category === category.slug 
                      ? "bg-muted font-medium" 
                      : "hover:bg-muted/50"
                  )}
                >
                  {category.name}
                </Link>
                {category.children.length > 0 && (
                  <nav className="ml-4 space-y-1 mt-1 border-l pl-2">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/products?category=${child.slug}`}
                        className={cn(
                          "block px-2 py-1 text-sm rounded-md transition-colors",
                          params.category === child.slug 
                            ? "bg-muted font-medium" 
                            : "text-muted-foreground hover:bg-muted/50"
                        )}
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

