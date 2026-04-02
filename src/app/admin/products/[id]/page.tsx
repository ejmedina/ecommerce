import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ProductForm } from "../product-form"

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
    orderBy: { name: "asc" },
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
  } as any

  return (
    <ProductForm
      product={productData}
      categories={categories}
    />
  )
}
