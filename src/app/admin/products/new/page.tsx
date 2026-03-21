import { db } from "@/lib/db"
import { ProductForm } from "../product-form"

export default async function NewProductPage() {
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

  return (
    <ProductForm
      categories={categories}
      brands={brands}
    />
  )
}
