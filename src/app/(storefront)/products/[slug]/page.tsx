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

          {product.discountType === "VOLUME_FIXED" && product.discountConfig && (
            (() => {
              try {
                const config = typeof product.discountConfig === "string" 
                  ? JSON.parse(product.discountConfig) 
                  : product.discountConfig;
                  
                if (config?.threshold && config?.value) {
                  return (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg my-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-green-500 rounded-full opacity-10"></div>
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="bg-green-100 p-2 rounded-full mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Promo por volumen</h3>
                          <p className="text-sm">
                            ¡Llevá <span className="font-bold">{config.threshold} unidades</span> y descontamos <span className="font-bold inline-block bg-green-200 px-1.5 py-0.5 rounded text-green-900">${config.value}</span> de tu carrito final!
                          </p>
                          <p className="text-xs mt-1 text-green-700/80">Válido combinando colores y talles del mismo producto.</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()
          )}

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
