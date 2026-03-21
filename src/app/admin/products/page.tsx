import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit } from "lucide-react"

export default async function ProductsPage() {
  const products = await db.product.findMany({
    include: {
      brand: true,
      category: true,
      images: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay productos todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {product.images[0] ? (
                  <img 
                    src={product.images[0].url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                {!product.isActive && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Inactivo
                    </span>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <Link href={`/admin/products/${product.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><strong>Precio:</strong> ${Number(product.price).toLocaleString("es-AR")}</p>
                  {product.comparePrice && (
                    <p className="text-muted-foreground line-through">
                      <strong>Precio anterior:</strong> ${Number(product.comparePrice).toLocaleString("es-AR")}
                    </p>
                  )}
                  <p><strong>Stock:</strong> {product.stock}</p>
                  <p><strong>Categoría:</strong> {product.category?.name || "Sin categoría"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
