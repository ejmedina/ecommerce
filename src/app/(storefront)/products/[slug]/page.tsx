import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { db } from "@/lib/db"
import { ProductDetailsClient } from "@/components/products/product-details-client"
import { formatCurrency } from "@/lib/utils"
import { getProductPromotions, parseVolumeFixedDiscountConfig } from "@/lib/product-promotions"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    include: { images: { take: 1, orderBy: { order: "asc" } } },
  })

  if (!product) return { title: "Producto no encontrado" }

  const title = product.metaTitle || product.name
  const description = product.metaDescription || product.description || product.name
  const imageUrl = product.images[0]?.url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 800,
              height: 800,
              alt: title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
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

  const promotions = getProductPromotions({
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    discountType: product.discountType,
    discountConfig: product.discountConfig,
    hasVariants: product.hasVariants,
  })
  const volumeDiscountConfig = product.discountType === "VOLUME_FIXED"
    ? parseVolumeFixedDiscountConfig(product.discountConfig)
    : null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          {product.images.length > 0 ? (
            <>
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <Image
                  src={product.images[0].url}
                  alt={product.images[0].alt || product.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                {promotions.length > 0 && (
                  <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-col gap-2">
                    {promotions.slice(0, 2).map((promotion) => (
                      <span
                        key={promotion.type}
                        className="w-fit rounded bg-primary px-3 py-1.5 text-xs font-semibold leading-none text-primary-foreground shadow-sm"
                      >
                        {promotion.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((image) => (
                    <div
                      key={image.id}
                      className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden border"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
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
            {promotions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {promotions.map((promotion) => (
                  <span
                    key={promotion.type}
                    className="rounded border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {promotion.detail || promotion.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {volumeDiscountConfig?.threshold && volumeDiscountConfig?.value && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-primary">
              <h3 className="mb-1 text-lg font-bold">Promo por cantidad</h3>
              <p className="text-sm">
                Llevá <span className="font-bold">{volumeDiscountConfig.threshold} unidades</span> y descontamos{" "}
                <span className="font-bold">{formatCurrency(Number(volumeDiscountConfig.value))}</span> del carrito.
              </p>
              {product.hasVariants && (
                <p className="mt-1 text-xs font-medium">
                  Válido combinando variantes del mismo producto.
                </p>
              )}
            </div>
          )}

          <ProductDetailsClient 
            product={{
              ...product,
              categoryName: product.category?.name || null,
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
