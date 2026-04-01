import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { addToCart } from "@/lib/actions/cart-actions"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, metaTitle: true, metaDescription: true },
  })
  if (!product) return { title: "Producto no encontrado" }
  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.name,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug, isActive: true },
      include: {
        images: { orderBy: { order: "asc" } },
        category: true,
      },
  })

  if (!product) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          {product.images.length > 0 ? (
            <>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  src={product.images[0].url}
                  alt={product.images[0].alt || product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((image) => (
                    <div
                      key={image.id}
                      className="w-20 h-20 shrink-0 rounded-md overflow-hidden border"
                    >
                      <img
                        src={image.url}
                        alt={image.alt || product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {product.sku && (
              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatCurrency(Number(product.price))}
            </span>
            {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrency(Number(product.comparePrice))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.hasPermanentStock ? (
              <span className="text-sm text-green-600 font-medium">
                En stock
              </span>
            ) : product.stock > 0 ? (
              <span className="text-sm text-green-600 font-medium">
                En stock ({product.stock} disponibles)
              </span>
            ) : (
              <span className="text-sm text-red-600 font-medium">
                Sin stock
              </span>
            )}
          </div>

          {product.description && (
            <div className="prose prose-sm max-w-none">
              <p>{product.description}</p>
            </div>
          )}

          {(product.stock > 0 || product.hasPermanentStock) && (
            <form action={addToCart} className="space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              <div className="flex gap-4">
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={product.hasPermanentStock ? 100 : product.stock}
                  defaultValue={1}
                  className="w-20 h-10 border rounded-md px-3"
                />
                <Button type="submit" size="lg" className="flex-1">
                  Agregar al carrito
                </Button>
              </div>
            </form>
          )}

          {product.category && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Categoría:{" "}
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:underline"
                >
                  {product.category.name}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
