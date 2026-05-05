import { db } from "@/lib/db"
import { HeroSlider, CategoryCards, BestSellers, InfoCards } from "@/components/home"

export default async function HomePage() {
  // Get settings from database
  const settings = await db.storeSettings.findFirst()
  
  // If no settings exist, show empty page (all disabled)
  if (!settings) {
    return (
      <>
        {/* No settings - all sections disabled by default */}
        <HeroSlider slides={[]} enabled={false} />
        <CategoryCards cards={[]} enabled={false} />
        <BestSellers products={[]} enabled={false} />
        <InfoCards cards={[]} enabled={false} />
      </>
    )
  }

  // Parse JSON fields with empty defaults
  const heroSlides = Array.isArray(settings.heroSlides) ? settings.heroSlides : []
  const categoryCards = Array.isArray(settings.categoryCards) ? settings.categoryCards : []
  const infoCards = Array.isArray(settings.infoCards) ? settings.infoCards : []

  // Get best sellers from active products with photos, ordered by sold units.
  const bestSellersLimit = settings.bestSellersLimit || 6
  const bestSellerRows = await db.$queryRaw<Array<{ id: string; sold: number }>>`
    SELECT
      p."id",
      COALESCE(SUM(
        CASE
          WHEN o."id" IS NOT NULL
            AND o."orderStatus" <> 'CANCELLED'
            AND (
              o."paymentStatus" IN ('PAID', 'AUTHORIZED')
              OR (
                o."paymentMethod" IN ('CASH_ON_DELIVERY', 'CARD_ON_DELIVERY', 'TRANSFER_ON_DELIVERY')
                AND o."orderStatus" IN ('CONFIRMED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED')
              )
            )
          THEN oi."quantityOrdered"
          ELSE 0
        END
      ), 0)::int AS sold
    FROM "products" p
    LEFT JOIN "order_items" oi ON oi."productId" = p."id"
    LEFT JOIN "orders" o ON o."id" = oi."orderId"
    WHERE p."isActive" = true
      AND EXISTS (
        SELECT 1
        FROM "product_images" pi
        WHERE pi."productId" = p."id"
      )
    GROUP BY p."id", p."createdAt"
    ORDER BY sold DESC, p."createdAt" DESC
    LIMIT ${bestSellersLimit}
  `
  const bestSellerIds = bestSellerRows.map((row) => row.id)
  const bestSellers = await db.product.findMany({
    where: { id: { in: bestSellerIds } },
    include: {
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  })
  const bestSellersById = new Map(bestSellers.map((product) => [product.id, product]))
  const sortedBestSellers = bestSellerIds.flatMap((id) => {
    const product = bestSellersById.get(id)
    return product ? [product] : []
  })

  return (
    <>
      {/* Hero Slider */}
      <HeroSlider 
        slides={heroSlides} 
        enabled={settings.heroSliderEnabled ?? false} 
      />

      {/* Category Cards */}
      <CategoryCards 
        cards={categoryCards} 
        enabled={settings.categoryCardsEnabled ?? false} 
      />

      {/* Best Sellers */}
      <BestSellers 
        products={sortedBestSellers.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price.toString(),
          comparePrice: p.comparePrice?.toString() || null,
          discountType: p.discountType,
          discountConfig: p.discountConfig,
          hasVariants: p.hasVariants,
          images: p.images,
        }))}
        enabled={settings.bestSellersEnabled ?? false}
      />

      {/* Info Cards */}
      <InfoCards 
        cards={infoCards} 
        enabled={settings.infoCardsEnabled ?? false} 
      />
    </>
  )
}
