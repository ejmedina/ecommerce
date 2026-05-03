import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ProductForm } from "../product-form"

type ProductFormProduct = {
  id: string
  name: string
  slug: string
  sku: string | null
  stock: number
  price: number
  comparePrice: number | null
  discountType: string
  discountConfig: unknown | null
  description: string | null
  categoryId: string | null
  metaTitle: string | null
  metaDescription: string | null
  isActive: boolean
  isFeatured: boolean
  images: { id: string; url: string; alt: string | null }[]
  hasPermanentStock: boolean
  hasVariants: boolean
  options: { id: string; name: string; values: string[]; position: number }[]
  variants: {
    id: string
    sku: string | null
    price: number | null
    comparePrice: number | null
    stock: number
    options: Record<string, string>
    title: string | null
    isActive: boolean
  }[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params
  
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { order: "asc" },
      },
      options: {
        orderBy: { position: "asc" }
      },
      variants: {
        orderBy: { createdAt: "asc" }
      }
    },
  })

  if (!product) {
    notFound()
  }

  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, order: true },
  })

  // Convert Decimal to plain numbers and handle variant data
  const productData = {
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    variants: product.variants.map(v => ({
      ...v,
      price: v.price ? Number(v.price) : null,
      comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
    }))
  } as ProductFormProduct

  return (
    <ProductForm
      product={productData}
      categories={categories}
    />
  )
}
