import dotenv from "dotenv"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import { Client } from "pg"
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"

dotenv.config({ path: ".env" })

const ENV_FILE = ".env"
const PRODUCT_IDS = [
  11514, 11516, 11525, 11527, 11519, 11522, 11466, 11469, 11535, 11532, 11472,
  11476, 10924, 10915, 10918, 10088, 10086, 10052, 10054, 10061, 10063, 10056,
  10058, 120, 8307, 9681, 9685, 9683, 8574, 10811, 10808, 8061, 8064, 8233,
  5773, 5782, 124, 327, 2757, 8617, 3342, 3029, 2751, 2753, 104, 116, 112, 319,
  254, 4660, 4658, 251, 253, 325, 8868, 8852, 8865, 8855, 8533, 8536, 8542,
  1610, 72, 276, 6838, 6836, 234, 299, 80, 301, 8666, 8668, 4682, 4672, 4677,
  4670, 10996, 4679, 4667, 163, 303, 159, 447, 236, 308, 84, 310, 6841, 6839,
  5238, 5236, 237, 305, 88, 317, 8662, 8664, 135, 131, 127, 335, 9734, 9737,
  6669, 6671, 9739, 9741, 11174, 11181, 11178, 11184, 5775, 9818, 9816, 10805,
  11356, 11361, 9873, 9875, 9871, 9877, 9755, 9757, 1279, 4300, 4301, 8052,
  8055, 8057, 11161, 3804, 3336, 2747, 6186, 10774, 10777, 8891, 9208, 4522,
  4589, 4508, 4591, 4520, 4511, 6055, 3718, 3717, 5403, 5407, 5405, 5408,
  5409, 5402,
]

type WooProduct = {
  id: number
  name: string
  slug: string
  description?: string | null
  sku?: string | null
  status?: string
  manage_stock?: boolean
  stock_quantity?: number | null
  stock_status?: string
  regular_price?: string
  sale_price?: string
  images?: Array<{ src: string; alt?: string | null }>
}

function readProductionDatabaseUrl() {
  const envContent = fs.readFileSync(ENV_FILE, "utf8")
  const match = envContent.match(/^#\s*DATABASE_URL=(?:"([^"]+)"|([^\n#]+))$/m)

  if (!match) {
    throw new Error(`No commented production DATABASE_URL found in ${ENV_FILE}`)
  }

  return (match[1] || match[2] || "").trim().replace(/^"/, "").replace(/"$/, "")
}

function buildDirectDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString)
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "")
  url.searchParams.delete("pgbouncer")
  url.searchParams.delete("connection_limit")
  url.searchParams.delete("pool_timeout")
  url.searchParams.delete("channel_binding")
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require")
  }
  return url.toString()
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function stripHtml(value: string | null | undefined) {
  return value ? value.replace(/<[^>]*>?/gm, "").trim() : null
}

function slugFallback(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toDecimal(value: string | undefined | null) {
  const parsed = Number.parseFloat(value || "0")
  return Number.isFinite(parsed) ? parsed : 0
}

const productionDbUrl = buildDirectDatabaseUrl(readProductionDatabaseUrl())

if (!process.env.WOO_URL || !process.env.WOO_KEY || !process.env.WOO_SECRET) {
  throw new Error("Missing WOO_URL, WOO_KEY or WOO_SECRET in .env")
}

process.env.DATABASE_URL = productionDbUrl
process.env.POSTGRES_URL_NON_POOLING = productionDbUrl

const db = new Client({
  connectionString: productionDbUrl,
})

const api = new WooCommerceRestApi({
  url: process.env.WOO_URL,
  consumerKey: process.env.WOO_KEY,
  consumerSecret: process.env.WOO_SECRET,
  version: "wc/v3",
})

const dryRun = process.argv.includes("--dry-run")

async function fetchProductsByIdList(ids: number[]) {
  const productsById = new Map<number, WooProduct>()

  for (const idsChunk of chunk(ids, 100)) {
    const response = await api.get("products", {
      include: idsChunk,
      per_page: idsChunk.length,
      orderby: "include",
    })

    for (const product of response.data as WooProduct[]) {
      productsById.set(product.id, product)
    }
  }

  return ids
    .map((id) => productsById.get(id))
    .filter((product): product is WooProduct => Boolean(product))
}

async function upsertCatalogProduct(product: WooProduct) {
  const slug = product.slug || slugFallback(product.name)
  const stock = Number.isFinite(Number(product.stock_quantity))
    ? Math.max(Number(product.stock_quantity || 0), 0)
    : 0

  const result = await db.query(
    `
    insert into "products" (
      "id",
      "name",
      "slug",
      "description",
      "sku",
      "stock",
      "hasPermanentStock",
      "price",
      "comparePrice",
      "categoryId",
      "hasVariants",
      "isFeatured",
      "isActive",
      "publishedAt",
      "updatedAt"
    ) values (
      $1, $2, $3, $4, $5, $6, true, $7, $8, null, false, false, true, now(), now()
    )
    on conflict ("slug") do update set
      "name" = excluded."name",
      "description" = excluded."description",
      "sku" = excluded."sku",
      "stock" = excluded."stock",
      "hasPermanentStock" = true,
      "price" = excluded."price",
      "comparePrice" = excluded."comparePrice",
      "categoryId" = null,
      "hasVariants" = false,
      "isFeatured" = false,
      "isActive" = true,
      "publishedAt" = excluded."publishedAt",
      "updatedAt" = now()
    returning "id"
    `,
    [
      randomUUID(),
      product.name,
      slug,
      stripHtml(product.description),
      product.sku || null,
      stock,
      toDecimal(product.sale_price || product.regular_price),
      product.sale_price ? toDecimal(product.regular_price) : null,
    ]
  )

  const productId = result.rows[0].id as string

  await db.query(`delete from "product_images" where "productId" = $1`, [productId])
  await db.query(`delete from "product_options" where "productId" = $1`, [productId])
  await db.query(`delete from "product_variants" where "productId" = $1`, [productId])

  if (product.images?.length) {
    for (let index = 0; index < product.images.length; index++) {
      const image = product.images[index]
      await db.query(
        `
        insert into "product_images" ("id", "productId", "url", "alt", "order")
        values ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), productId, image.src, image.alt || product.name, index]
      )
    }
  }
}

async function main() {
  const products = await fetchProductsByIdList(PRODUCT_IDS)
  const foundIds = new Set(products.map((product) => product.id))
  const missingIds = PRODUCT_IDS.filter((id) => !foundIds.has(id))

  console.log(`Requested products: ${PRODUCT_IDS.length}`)
  console.log(`Found in WooCommerce: ${products.length}`)

  if (missingIds.length > 0) {
    console.log("Missing product IDs:", missingIds)
  }

  if (dryRun) {
    console.log("Dry run only, nothing was written.")
    return
  }

  await db.connect()
  await db.query("begin")

  try {
    for (const product of products) {
      await upsertCatalogProduct(product)
      console.log(`✅ Imported: ${product.id} - ${product.name}`)
    }

    await db.query("commit")
    console.log(`\nImport complete. Products imported: ${products.length}`)
  } catch (error) {
    await db.query("rollback").catch(() => null)
    throw error
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error("❌ Import failed:", error)
  process.exit(1)
})
