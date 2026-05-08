import { notFound, permanentRedirect } from "next/navigation"
import { db } from "@/lib/db"

interface LegacyProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function LegacyProductPage({ params }: LegacyProductPageProps) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    select: { slug: true, isActive: true },
  })

  if (!product?.isActive) {
    notFound()
  }

  permanentRedirect(`/products/${product.slug}`)
}
