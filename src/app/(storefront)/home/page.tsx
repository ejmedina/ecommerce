import { db } from "@/lib/db"
import { HeroSlider, CategoryCards, BestSellers, InfoCards } from "@/components/home"

// Default data for when no settings exist
const defaultHeroSlides = [
  {
    image: "/uploads/store/slide-default.jpg",
    title: "Artesano",
    subtitle: "Si es rico solo, es rico con todo.",
    ctaText: "Comprar",
    ctaLink: "/products",
  },
]

const defaultCategoryCards = [
  {
    image: "/uploads/store/category-panificados.jpg",
    title: "Panificados",
    subtitle: "Disfrutá del sabor casero.",
    ctaText: "Comprar ahora",
    ctaLink: "/products?category=panificados",
  },
  {
    image: "/uploads/store/category-dulces.jpg",
    title: "Dulces",
    subtitle: "El sabor que alegra tus tardes.",
    ctaText: "Comprar ahora",
    ctaLink: "/products?category=dulces",
  },
  {
    image: "/uploads/store/category-salados.jpg",
    title: "Salados",
    subtitle: "Opciones para picar en cualquier momento.",
    ctaText: "Comprar ahora",
    ctaLink: "/products?category=salados",
  },
  {
    image: "/uploads/store/category-snacks.jpg",
    title: "Snacks",
    subtitle: "Snackeá sin parar.",
    ctaText: "Comprar ahora",
    ctaLink: "/products?category=snacks",
  },
]

const defaultInfoCards = [
  {
    icon: "quality",
    title: "La mejor calidad, en casa",
    description: "Una cuidada selección de productos premium, con entrega directa a tu hogar.",
  },
  {
    icon: "price",
    title: "Lo rico, a buen precio",
    description: "Directo desde la fábrica a tu hogar. La mejor calidad, precios que hacen bien.",
  },
  {
    icon: "delivery",
    title: "Lo pedís, te lo llevamos",
    description: "Pedí fácil y recibilo sin cargo en Zona Norte. Para compras mínimas de $40.000.",
  },
]

export default async function HomePage() {
  // Get settings from database
  let settings = await db.storeSettings.findFirst()
  
  // Create default settings if none exist
  if (!settings) {
    settings = await db.storeSettings.create({
      data: {
        storeName: "Mi Tienda",
        heroSliderEnabled: true,
        heroSlides: defaultHeroSlides,
        categoryCardsEnabled: true,
        categoryCards: defaultCategoryCards,
        bestSellersEnabled: true,
        bestSellersLimit: 6,
        infoCardsEnabled: true,
        infoCards: defaultInfoCards,
      },
    })
  }

  // Parse JSON fields
  const heroSlides = Array.isArray(settings.heroSlides) 
    ? settings.heroSlides 
    : defaultHeroSlides
    
  const categoryCards = Array.isArray(settings.categoryCards) 
    ? settings.categoryCards 
    : defaultCategoryCards
    
  const infoCards = Array.isArray(settings.infoCards) 
    ? settings.infoCards 
    : defaultInfoCards

  // Get best sellers products
  const bestSellers = await db.product.findMany({
    where: { isActive: true },
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
        enabled={settings.heroSliderEnabled ?? true} 
      />

      {/* Category Cards */}
      <CategoryCards 
        cards={categoryCards} 
        enabled={settings.categoryCardsEnabled ?? true} 
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
        enabled={settings.bestSellersEnabled ?? true}
      />

      {/* Info Cards */}
      <InfoCards 
        cards={infoCards} 
        enabled={settings.infoCardsEnabled ?? true} 
      />
    </>
  )
}
