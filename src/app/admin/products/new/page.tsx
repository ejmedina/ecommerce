import { db } from "@/lib/db"
import { ProductForm } from "../product-form"

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <ProductForm
      categories={categories}
    />
  )
}
