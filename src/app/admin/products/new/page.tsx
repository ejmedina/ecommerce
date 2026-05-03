import { db } from "@/lib/db"
import { ProductForm } from "../product-form"

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, order: true },
  })

  return (
    <ProductForm
      categories={categories}
    />
  )
}
