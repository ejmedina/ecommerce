import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@tienda.com" },
    update: {},
    create: {
      email: "admin@tienda.com",
      name: "Admin",
      passwordHash: "$2a$10$fakehashforadminuser", // In production, use proper hashing
      role: "ADMIN",
      phone: "1234567890",
    },
  })
  console.log("✅ Created admin user:", admin.email)

  // Create customer user
  const customer = await prisma.user.upsert({
    where: { email: "cliente@ejemplo.com" },
    update: {},
    create: {
      email: "cliente@ejemplo.com",
      name: "Juan Pérez",
      passwordHash: "$2a$10$fakehashforcustomeruser",
      role: "CUSTOMER",
      phone: "1122334455",
    },
  })
  console.log("✅ Created customer user:", customer.email)

  // Create brands
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: "techmax" },
      update: {},
      create: { name: "TechMax", slug: "techmax", isActive: true },
    }),
    prisma.brand.upsert({
      where: { slug: "home-style" },
      update: {},
      create: { name: "HomeStyle", slug: "home-style", isActive: true },
    }),
    prisma.brand.upsert({
      where: { slug: "sportpro" },
      update: {},
      create: { name: "SportPro", slug: "sportpro", isActive: true },
    }),
  ])
  console.log("✅ Created brands")

  // Create categories
  const categorias = await prisma.category.upsert({
    where: { slug: "electronica" },
    update: {},
    create: {
      name: "Electrónica",
      slug: "electronica",
      isActive: true,
      order: 1,
    },
  })

  const hogar = await prisma.category.upsert({
    where: { slug: "hogar" },
    update: {},
    create: {
      name: "Hogar",
      slug: "hogar",
      isActive: true,
      order: 2,
    },
  })

  const deportes = await prisma.category.upsert({
    where: { slug: "deportes" },
    update: {},
    create: {
      name: "Deportes",
      slug: "deportes",
      isActive: true,
      order: 3,
    },
  })
  console.log("✅ Created categories")

  // Create products
  const products = [
    {
      name: "Auriculares Bluetooth Pro",
      slug: "auriculares-bluetooth-pro",
      description: "Auriculares wireless con cancelación de ruido y 30h de batería",
      brandId: brands[0].id,
      categoryId: categorias.id,
      sku: "TECH-AUD-001",
      stock: 50,
      price: 15999,
      comparePrice: 19999,
      isFeatured: true,
      isActive: true,
    },
    {
      name: "Smartwatch Fitness",
      slug: "smartwatch-fitness",
      description: "Reloj inteligente con monitor de ritmo cardíaco y GPS",
      brandId: brands[0].id,
      categoryId: categorias.id,
      sku: "TECH-WATCH-001",
      stock: 30,
      price: 24999,
      comparePrice: 29999,
      isFeatured: true,
      isActive: true,
    },
    {
      name: "Juego de Sábanas Algodón",
      slug: "sabanas-algodon-premium",
      description: "Juego de sábanas 4 piezas 100% algodón egipcio",
      brandId: brands[1].id,
      categoryId: hogar.id,
      sku: "HOME-SAB-001",
      stock: 100,
      price: 8999,
      comparePrice: 12999,
      isFeatured: true,
      isActive: true,
    },
    {
      name: "Set de Vajilla 12 Piezas",
      slug: "set-vajilla-12-piezas",
      description: "Vajilla de cerámica con diseño moderno",
      brandId: brands[1].id,
      categoryId: hogar.id,
      sku: "HOME-VAJ-001",
      stock: 25,
      price: 15999,
      isFeatured: false,
      isActive: true,
    },
    {
      name: "Pelota de Fútbol Profesional",
      slug: "pelota-futbol-profesional",
      description: "Pelota de fútbol profesional FIFA approved",
      brandId: brands[2].id,
      categoryId: deportes.id,
      sku: "SPORT-FUT-001",
      stock: 200,
      price: 5999,
      isFeatured: true,
      isActive: true,
    },
    {
      name: "Mancuernas 10kg Par",
      slug: "mancuernas-10kg",
      description: "Pesas ajustables recubiertas en vinilo",
      brandId: brands[2].id,
      categoryId: deportes.id,
      sku: "SPORT-MAN-001",
      stock: 40,
      price: 7999,
      isFeatured: false,
      isActive: true,
    },
  ]

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
    
    // Add placeholder images
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `https://placehold.co/600x400?text=${encodeURIComponent(p.name)}`,
        alt: p.name,
        order: 0,
      },
    })
  }
  console.log("✅ Created 6 products with images")

  // Create store settings
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Mi Tienda",
      storeEmail: "contacto@mitienda.com",
      storePhone: "011-1234-5678",
      freeShippingMin: 25000,
      fixedShippingCost: 1500,
    },
  })
  console.log("✅ Created store settings")

  console.log("\n🎉 Seeding completed!")
  console.log("\n📝 Login credentials:")
  console.log("   Admin: admin@tienda.com / admin123")
  console.log("   Customer: cliente@ejemplo.com / cliente123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
