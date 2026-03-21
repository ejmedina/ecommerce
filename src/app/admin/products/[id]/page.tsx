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
    },
  })

  if (!product) {
    notFound()
  }

  const [categories, brands] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Convert Decimal to plain numbers
  const productData = {
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
  }

  return (
    <ProductForm
      product={productData}
      categories={categories}
      brands={brands}
    />
  )
}
