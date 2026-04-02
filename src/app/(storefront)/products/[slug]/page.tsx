import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { addToCart } from "@/lib/actions/cart-actions"
import { ProductDetailsClient } from "@/components/products/product-details-client"

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
        options: { orderBy: { position: "asc" } },
        variants: { where: { isActive: true } },
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

          <ProductDetailsClient 
            product={{
              ...product,
              price: Number(product.price),
              comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
              options: product.options.map(opt => ({
                id: opt.id,
                name: opt.name,
                values: opt.values
              })),
              variants: product.variants.map(v => ({
                id: v.id,
                sku: v.sku,
                price: v.price ? Number(v.price) : null,
                stock: v.stock,
                options: v.options,
                title: v.title
              }))
            }} 
          />

          {product.description && (
            <div className="prose prose-sm max-w-none">
              <p>{product.description}</p>
            </div>
          )}

          {/* El formulario está ahora dentro de ProductDetailsClient */}

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
