import { db } from "@/lib/db"
import { ProductForm } from "../product-form"

export default async function NewProductPage() {
  const [categories, availableProducts] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true, order: true },
    }),
    db.product.findMany({
      where: { isCombo: false },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        sku: true,
        hasVariants: true,
        isActive: true,
      },
    }),
  ])

  return (
    <ProductForm
      categories={categories}
      availableProducts={availableProducts}
    />
  )
}
