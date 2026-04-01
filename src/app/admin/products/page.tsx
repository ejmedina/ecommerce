import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit, ImageOff, AlertCircle } from "lucide-react"
import { ProductFilters } from "./product-filters"
import { PaginationControls } from "./pagination-controls"
import { Badge } from "@/components/ui/badge"

export default async function ProductsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  
  // Params parsing
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined
  const categoryId = typeof searchParams.category === 'string' && searchParams.category !== 'all' ? searchParams.category : undefined
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'date_desc'
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
  const limit = 20
  const skip = (page - 1) * limit

  // Query conditions
  const where: any = {
    AND: [
      search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ]
      } : {},
      categoryId ? { categoryId } : {},
    ]
  }

  // Sorting
  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'date_asc') orderBy = { createdAt: 'asc' }
  if (sort === 'price_asc') orderBy = { price: 'asc' }
  if (sort === 'price_desc') orderBy = { price: 'desc' }
  if (sort === 'stock_asc') orderBy = { stock: 'asc' }

  // Execute database queries
  const [products, totalItems, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { 
        category: true, 
        images: { 
          take: 1, 
          orderBy: { order: 'asc' } 
        } 
      },
      orderBy,
      skip,
      take: limit,
    }),
    db.product.count({ where }),
    db.category.findMany({ 
      where: { parentId: null }, // Mostramos categorías raíz en el filtro por simplicidad
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona el inventario, precios y categorías de tu tienda.</p>
        </div>
        <Link href="/admin/products/new">
          <Button size="lg" className="shadow-sm">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      <ProductFilters categories={categories} />

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4 w-[80px]">Imagen</th>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 opacity-20" />
                        <p>No se encontraron productos con estos filtros.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="h-12 w-12 rounded-md border bg-muted overflow-hidden flex-shrink-0 shadow-sm">
                          {product.images[0] ? (
                            <img 
                              src={product.images[0].url} 
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageOff className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 max-w-[300px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground line-clamp-1">{product.name}</span>
                          <span className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">SKU: {product.sku || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="font-normal border-muted-foreground/20">
                          {product.category?.name || "Sin categoría"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className={`font-medium ${product.stock <= 5 && !product.hasPermanentStock ? "text-red-600 font-bold" : ""}`}>
                            {product.stock} unidades
                          </span>
                          {product.hasPermanentStock && (
                            <span className="text-[10px] uppercase font-bold text-blue-600">Permanente</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">${Number(product.price).toLocaleString("es-AR")}</span>
                          {product.comparePrice && (
                            <span className="text-xs text-muted-foreground line-through opacity-60">
                              ${Number(product.comparePrice).toLocaleString("es-AR")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {product.isActive ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="secondary" className="opacity-50">Inactivo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/admin/products/${product.id}`}>
                          <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            <Edit className="h-4 w-4 mr-1.5" />
                            Editar
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls 
            currentPage={page} 
            totalItems={totalItems} 
            itemsPerPage={limit} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
