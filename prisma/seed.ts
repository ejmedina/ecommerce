import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create admin user
  // Password: admin123 (hash generado con bcrypt)
  const admin = await prisma.user.upsert({
    where: { email: "admin@tienda.com" },
    update: {},
    create: {
      email: "admin@tienda.com",
      name: "Admin",
      passwordHash: "$2b$10$DIwCwbhBWeQzC1SC42iWgO/qTHLUiMspdc/lq9hrdCSTgcvfia99u",
      role: "ADMIN",
      phone: "1234567890",
    },
  })
  console.log("✅ Created admin user:", admin.email)

  // Create customer users
  const customer1 = await prisma.user.upsert({
    where: { email: "juan.perez@email.com" },
    update: {},
    create: {
      email: "juan.perez@email.com",
      name: "Juan Pérez",
      passwordHash: "$2a$10$fakehashforcustomeruser",
      role: "CUSTOMER",
      phone: "1122334455",
    },
  })

  const customer2 = await prisma.user.upsert({
    where: { email: "maria.garcia@email.com" },
    update: {},
    create: {
      email: "maria.garcia@email.com",
      name: "María García",
      passwordHash: "$2a$10$fakehashforcustomeruser2",
      role: "CUSTOMER",
      phone: "1199887766",
    },
  })

  const customer3 = await prisma.user.upsert({
    where: { email: "carlos.rodriguez@email.com" },
    update: {},
    create: {
      email: "carlos.rodriguez@email.com",
      name: "Carlos Rodríguez",
      passwordHash: "$2a$10$fakehashforcustomeruser3",
      role: "CUSTOMER",
      phone: "1155447788",
    },
  })
  console.log("✅ Created 3 customer users")

  console.log("✅ Brands bypassed")

  // Create categories
  const electronica = await prisma.category.upsert({
    where: { slug: "electronica" },
    update: {},
    create: { name: "Electrónica", slug: "electronica", isActive: true, order: 1 },
  })

  const hogar = await prisma.category.upsert({
    where: { slug: "hogar" },
    update: {},
    create: { name: "Hogar", slug: "hogar", isActive: true, order: 2 },
  })

  const deportes = await prisma.category.upsert({
    where: { slug: "deportes" },
    update: {},
    create: { name: "Deportes", slug: "deportes", isActive: true, order: 3 },
  })
  console.log("✅ Created categories")

  // Create products
  const products = [
    {
      name: "Auriculares Bluetooth Pro",
      slug: "auriculares-bluetooth-pro",
      description: "Auriculares wireless con cancelación de ruido y 30h de batería",
      categoryId: electronica.id,
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
      categoryId: electronica.id,
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
      categoryId: deportes.id,
      sku: "SPORT-MAN-001",
      stock: 40,
      price: 7999,
      isFeatured: false,
      isActive: true,
    },
  ]

  const createdProducts: any[] = []
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
    createdProducts.push(product)
    
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

  // Create sample orders
  const orders = [
    // Order 1: Pagado, en preparación
    {
      orderNumber: "ORD-00001",
      userId: customer1.id,
      orderStatus: "PREPARING",
      paymentMethod: "ONLINE_CARD",
      paymentStatus: "PAID",
      
      subtotal: 15999,
      shippingCost: 1500,
      taxAmount: 0,
      discountAmount: 0,
      total: 17499,
      shippingMethod: "delivery",
      shippingAddress: {
        street: "Av. Corrientes",
        number: "1234",
        floor: "5",
        apartment: "B",
        city: "Buenos Aires",
        state: "CABA",
        postalCode: "C1043",
        country: "Argentina",
        instructions: "Portero eléctrico",
      },
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      customerNotes: "Necesito el producto para el fin de semana",
    },
    // Order 2: Pago contra entrega, listo para entregar
    {
      orderNumber: "ORD-00002",
      userId: customer2.id,
      orderStatus: "READY_FOR_DELIVERY",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
      
      subtotal: 17998,
      shippingCost: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 17998,
      shippingMethod: "delivery",
      shippingAddress: {
        street: "Calle Florida",
        number: "567",
        city: "Vicente López",
        state: "BUENOS_AIRES",
        postalCode: "B1602",
        country: "Argentina",
      },
      customerNotes: "Llamar antes de entregar",
    },
    // Order 3: Pagado, en reparto
    {
      orderNumber: "ORD-00003",
      userId: customer3.id,
      orderStatus: "OUT_FOR_DELIVERY",
      paymentMethod: "ONLINE_CARD",
      paymentStatus: "PAID",
      
      subtotal: 40998,
      shippingCost: 1500,
      taxAmount: 0,
      discountAmount: 2000,
      total: 40498,
      shippingMethod: "delivery",
      shippingAddress: {
        street: "Av. Santa Fe",
        number: "890",
        floor: "2",
        city: "Buenos Aires",
        state: "CABA",
        postalCode: "C1059",
        country: "Argentina",
      },
      paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    // Order 4: Confirmado, pendiente de pago (transferencia) - pickup
    {
      orderNumber: "ORD-00004",
      userId: customer1.id,
      orderStatus: "CONFIRMED",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PENDING",
      
      subtotal: 23998,
      shippingCost: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 23998,
      shippingMethod: "pickup",
      shippingAddress: { pickup: true, notes: "Retiro en tienda" },
    },
    // Order 5: Entregado
    {
      orderNumber: "ORD-00005",
      userId: customer2.id,
      orderStatus: "DELIVERED",
      paymentMethod: "ONLINE_CARD",
      paymentStatus: "PAID",
      
      subtotal: 5999,
      shippingCost: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 5999,
      shippingMethod: "delivery",
      shippingAddress: {
        street: "Calle Lavalle",
        number: "123",
        city: "Buenos Aires",
        state: "CABA",
        postalCode: "C1048",
        country: "Argentina",
      },
      paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    // Order 6: Recibido, nuevo pedido online
    {
      orderNumber: "ORD-00006",
      userId: customer3.id,
      orderStatus: "RECEIVED",
      paymentMethod: "DIGITAL_WALLET",
      paymentStatus: "PENDING",
      
      subtotal: 8999,
      shippingCost: 1500,
      taxAmount: 0,
      discountAmount: 0,
      total: 10499,
      shippingMethod: "delivery",
      shippingAddress: {
        street: "Av. Rivadavia",
        number: "4500",
        floor: "8",
        city: "Buenos Aires",
        state: "CABA",
        postalCode: "C1405",
        country: "Argentina",
      },
    },
  ]

  for (const orderData of orders) {
    const order = await prisma.order.create({
      data: {
        orderNumber: orderData.orderNumber,
        userId: orderData.userId,
        orderStatus: orderData.orderStatus as any,
        paymentMethod: orderData.paymentMethod as any,
        paymentStatus: orderData.paymentStatus as any,
        subtotal: orderData.subtotal,
        shippingCost: orderData.shippingCost,
        taxAmount: orderData.taxAmount,
        discountAmount: orderData.discountAmount,
        total: orderData.total,
        shippingMethod: orderData.shippingMethod,
        shippingAddress: orderData.shippingAddress,
        paidAt: (orderData as any).paidAt || null,
        customerNotes: (orderData as any).customerNotes || null,
      },
    })

    // Add items based on order
    let items: { productId: string; quantity: number; price: number }[] = []
    
    if (orderData.orderNumber === "ORD-00001") {
      items = [{ productId: createdProducts[0].id, quantity: 1, price: 15999 }]
    } else if (orderData.orderNumber === "ORD-00002") {
      items = [
        { productId: createdProducts[4].id, quantity: 2, price: 5999 },
        { productId: createdProducts[5].id, quantity: 1, price: 7999 },
      ]
    } else if (orderData.orderNumber === "ORD-00003") {
      items = [
        { productId: createdProducts[1].id, quantity: 1, price: 24999 },
        { productId: createdProducts[0].id, quantity: 1, price: 15999 },
      ]
    } else if (orderData.orderNumber === "ORD-00004") {
      items = [{ productId: createdProducts[3].id, quantity: 1, price: 15999 }, { productId: createdProducts[2].id, quantity: 1, price: 8999 }]
    } else if (orderData.orderNumber === "ORD-00005") {
      items = [{ productId: createdProducts[4].id, quantity: 1, price: 5999 }]
    } else if (orderData.orderNumber === "ORD-00006") {
      items = [{ productId: createdProducts[2].id, quantity: 1, price: 8999 }]
    }

    for (const item of items) {
      const product = createdProducts.find((p: any) => p.id === item.productId)
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          name: product?.name || "Product",
          sku: product?.sku || "",
          price: item.price,
          quantityOrdered: item.quantity,
          unitTotal: item.price * item.quantity,
        },
      })
    }
  }
  console.log("✅ Created 6 sample orders with items")

  console.log("\n🎉 Seeding completed!")
  console.log("\n📝 Login credentials:")
  console.log("   Admin: admin@tienda.com / admin123")
  console.log("\n📝 Sample customers:")
  console.log("   Juan Pérez: juan.perez@email.com")
  console.log("   María García: maria.garcia@email.com")
  console.log("   Carlos Rodríguez: carlos.rodriguez@email.com")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
