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

  // Get best sellers products
  const bestSellers = await db.product.findMany({
    where: { 
      isActive: true,
      OR: [
        { stock: { gt: 0 } },
        { hasPermanentStock: true }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: settings.bestSellersLimit || 6,
    include: {
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
    },
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
        products={bestSellers.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price.toString(),
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
