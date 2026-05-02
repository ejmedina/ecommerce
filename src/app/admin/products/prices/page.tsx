import Link from "next/link"
import { Prisma } from "@prisma/client"
import { AlertCircle, Edit, ImageOff, Save } from "lucide-react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { updateProductPrice, updateVariantPrice } from "./actions"
import { PriceProductSearch } from "./price-product-search"

interface Props {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
    status?: string
    sort?: string
  }>
}

const ITEMS_PER_PAGE = 24

function formatNumber(value: unknown) {
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default async function ProductPricesPage({ searchParams }: Props) {
  const params = await searchParams
  const search = params.search?.trim() || ""
  const categoryId = params.category && params.category !== "all" ? params.category : undefined
  const status = params.status || "active"
  const sort = params.sort || "name_asc"
  const page = Number.parseInt(params.page || "1", 10)

  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? {
          name: { contains: search, mode: "insensitive" },
        }
      : {}),
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" }
  if (sort === "name_desc") orderBy = { name: "desc" }
  if (sort === "price_asc") orderBy = { price: "asc" }
  if (sort === "price_desc") orderBy = { price: "desc" }
  if (sort === "updated_desc") orderBy = { updatedAt: "desc" }

  const [products, totalItems, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { order: "asc" } },
        variants: {
          orderBy: [{ isActive: "desc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            sku: true,
            price: true,
            comparePrice: true,
            stock: true,
            isActive: true,
          },
        },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Precios</h1>
          <p className="text-sm text-muted-foreground">
            Edición rápida de precios de productos y variantes.
          </p>
        </div>

        <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_150px_160px_auto] lg:w-[900px]">
          <PriceProductSearch defaultValue={search} />
          <select
            name="category"
            defaultValue={categoryId || "all"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="name_asc">Nombre A-Z</option>
            <option value="name_desc">Nombre Z-A</option>
            <option value="price_asc">Precio menor</option>
            <option value="price_desc">Precio mayor</option>
            <option value="updated_desc">Actualizados</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {products.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 opacity-30" />
                <p>No se encontraron productos con estos filtros.</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="p-4">
                  <div className="grid gap-4 lg:grid-cols-[64px_minmax(220px,1fr)_minmax(520px,auto)] lg:items-center">
                    <div className="h-16 w-16 overflow-hidden rounded-md border bg-muted">
                      {product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div>
                        <h2 className="truncate font-semibold">{product.name}</h2>
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku || "N/A"} · {product.category?.name || "Sin categoría"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                        <Badge variant="outline">Stock {product.hasPermanentStock ? "permanente" : product.stock}</Badge>
                        {product.hasVariants ? <Badge variant="outline">{product.variants.length} variantes</Badge> : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                      <form id={`price-${product.id}`} action={updateProductPrice} className="contents">
                        <input type="hidden" name="productId" value={product.id} />
                        <label className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Precio</span>
                          <input
                            name="price"
                            inputMode="decimal"
                            defaultValue={formatNumber(product.price)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Precio tachado</span>
                          <input
                            name="comparePrice"
                            inputMode="decimal"
                            defaultValue={product.comparePrice ? formatNumber(product.comparePrice) : ""}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                          />
                        </label>
                      </form>
                      <Button type="submit" form={`price-${product.id}`} size="sm">
                        <Save className="h-4 w-4 mr-1.5" />
                        Guardar
                      </Button>
                      <Link href={`/admin/products/${product.id}`}>
                        <Button type="button" variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1.5" />
                          Ficha
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {product.variants.length > 0 ? (
                    <div className="mt-4 space-y-2 border-l pl-4">
                      {product.variants.map((variant) => (
                        <form
                          key={variant.id}
                          action={updateVariantPrice}
                          className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[minmax(180px,1fr)_120px_160px_160px_auto] md:items-end"
                        >
                          <input type="hidden" name="variantId" value={variant.id} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{variant.title || "Variante sin título"}</p>
                            <p className="text-xs text-muted-foreground">SKU: {variant.sku || "N/A"}</p>
                          </div>
                          <Badge variant={variant.isActive ? "success" : "secondary"} className="w-fit">
                            {variant.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                          <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Precio</span>
                            <input
                              name="price"
                              inputMode="decimal"
                              defaultValue={variant.price ? formatNumber(variant.price) : formatNumber(product.price)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Precio tachado</span>
                            <input
                              name="comparePrice"
                              inputMode="decimal"
                              defaultValue={variant.comparePrice ? formatNumber(variant.comparePrice) : ""}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                            />
                          </label>
                          <Button type="submit" variant="outline" size="sm">
                            <Save className="h-4 w-4 mr-1.5" />
                            Guardar
                          </Button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <PaginationControls
            currentPage={page}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            basePath="/admin/products/prices"
          />
        </CardContent>
      </Card>
    </div>
  )
}
