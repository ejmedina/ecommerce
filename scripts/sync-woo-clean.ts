import { PrismaClient } from "@prisma/client";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const api = new WooCommerceRestApi({
  url: process.env.WOO_URL || "",
  consumerKey: process.env.WOO_KEY || "",
  consumerSecret: process.env.WOO_SECRET || "",
  version: "wc/v3",
});

async function syncCategories() {
  console.log("📁 Sincronizando categorías...");
  let page = 1;
  let allCategories: any[] = [];
  
  while (true) {
    const response = await api.get("products/categories", { page, per_page: 100 });
    if (response.data.length === 0) break;
    allCategories = [...allCategories, ...response.data];
    page++;
  }

  // Ordenar por parent_id para procesar primero las de nivel superior
  allCategories.sort((a, b) => a.parent - b.parent);

  for (const cat of allCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description || null,
        // En Woocomerce cat.image.src existe si hay imagen
        image: cat.image?.src || null,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null,
        image: cat.image?.src || null,
        isActive: true,
      }
    });
  }
  console.log(`✅ ${allCategories.length} categorías sincronizadas.`);
  return allCategories;
}

async function syncProducts() {
  console.log("📦 Sincronizando productos (solo activos)...");
  let page = 1;
  const perPage = 50;

  while (true) {
    const response = await api.get("products", { 
      page, 
      per_page: perPage,
      status: "publish" // Solo productos activos (publicados)
    });

    if (response.data.length === 0) break;

    for (const wooProduct of response.data) {
      const {
        name,
        slug,
        description,
        sku,
        stock_quantity,
        regular_price,
        sale_price,
        categories,
        images,
        status
      } = wooProduct;

      // Calcular precios
      const priceValue = parseFloat(sale_price || regular_price || "0");
      const comparePriceValue = sale_price ? parseFloat(regular_price) : null;

      // Buscar categoría principal (primera de la lista)
      let categoryId: string | null = null;
      if (categories && categories.length > 0) {
        const category = await prisma.category.findUnique({
          where: { slug: categories[0].slug }
        });
        categoryId = category?.id || null;
      }

      // Upsert del producto
      const product = await prisma.product.upsert({
        where: { slug }, // Usamos slug como identificador confiable
        update: {
          name,
          description: description ? description.replace(/<[^>]*>?/gm, '') : null, // Limpiar HTML básico
          sku: sku || null,
          stock: stock_quantity || 0,
          price: priceValue,
          comparePrice: comparePriceValue,
          categoryId,
          isActive: status === "publish",
        },
        create: {
          name,
          slug,
          description: description ? description.replace(/<[^>]*>?/gm, '') : null,
          sku: sku || null,
          stock: stock_quantity || 0,
          price: priceValue,
          comparePrice: comparePriceValue,
          categoryId,
          isActive: status === "publish",
        },
      });

      // Sincronizar imágenes
      // Primero eliminamos las que existen para este producto y creamos las nuevas (o simplemente añadimos las de Woo)
      // Nota: En una versión más pro, evitaríamos duplicar si los URLs son los mismos.
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: images[i].src,
              alt: images[i].alt || name,
              order: i,
            }
          });
        }
      }

      console.log(`✅ Producto procesado: ${name}`);
    }

    page++;
  }
}

async function cleanupDatabase() {
  console.log("🧹 Limpiando catálogo y productos existentes...");
  
  // El orden es importante para las claves foráneas
  // Primero tablas dependientes
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  
  // Luego las principales
  await prisma.product.deleteMany();
  
  // Finalmente categorías (primero quitamos parentId para evitar errores de FK en la auto-referencia)
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany();
  
  console.log("✅ Base de datos limpia (Productos, Categorías e Imágenes eliminados).");
}

async function main() {
  try {
    console.log("🚀 Iniciando SINCRONIZACIÓN LIMPIA desde WooCommerce...");
    
    await cleanupDatabase();
    await syncCategories();
    await syncProducts();
    
    console.log("\n✨ IMPORTACIÓN Y LIMPIEZA COMPLETADA CON ÉXITO.");
  } catch (error: any) {
    console.error("❌ Error durante el proceso:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
