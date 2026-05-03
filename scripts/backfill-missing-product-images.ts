import dotenv from "dotenv"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import { Client } from "pg"
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"

dotenv.config({ path: ".env" })

const ENV_FILE = ".env"
const dryRun = process.argv.includes("--dry-run")
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] || "0", 10) : 0

type DbProduct = {
  id: string
  slug: string
  name: string
}

type WooProduct = {
  id: number
  name: string
  slug: string
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

function slugFallback(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const productionDbUrl = buildDirectDatabaseUrl(readProductionDatabaseUrl())
const WOO_REQUEST_DELAY_MS = Number.parseInt(
  process.env.WOO_REQUEST_DELAY_MS || "500",
  10
)

if (!process.env.WOO_URL || !process.env.WOO_KEY || !process.env.WOO_SECRET) {
  throw new Error("Missing WOO_URL, WOO_KEY or WOO_SECRET in .env")
}

const db = new Client({ connectionString: productionDbUrl })

const api = new WooCommerceRestApi({
  url: process.env.WOO_URL,
  consumerKey: process.env.WOO_KEY,
  consumerSecret: process.env.WOO_SECRET,
  version: "wc/v3",
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getProductsWithoutImages() {
  let query = `
    select
      p.id,
      p.slug,
      p.name
    from "products" p
    left join "product_images" pi on pi."productId" = p.id
    where pi.id is null
    order by p."createdAt" asc
  `

  const params: unknown[] = []
  if (limit > 0) {
    query += ` limit $1`
    params.push(limit)
  }

  const result = await db.query(query, params)
  return result.rows as DbProduct[]
}

async function fetchWooProductBySlug(slug: string) {
  const delays = [500, 1500, 3000]

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const response = await api.get("products", {
        slug,
        per_page: 1,
        status: "publish",
      })

      const product = response.data?.[0] as WooProduct | undefined
      return product || null
    } catch (error: unknown) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response?.status ===
          "number"
          ? (error as { response?: { status?: number } }).response?.status
          : undefined
      const retryable = status === 429 || status === 503

      if (!retryable || attempt === delays.length) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }

  return null
}

async function backfillImages(product: DbProduct) {
  try {
    const wooProduct = await fetchWooProductBySlug(
      product.slug || slugFallback(product.name)
    )

    if (!wooProduct) {
      return { status: "missing_in_woo" as const }
    }

    const images = wooProduct.images || []
    if (images.length === 0) {
      return { status: "no_images_in_woo" as const, wooProduct }
    }

    if (dryRun) {
      return {
        status: "dry_run" as const,
        wooProduct,
        imageCount: images.length,
      }
    }

    for (let index = 0; index < images.length; index++) {
      const image = images[index]
      await db.query(
        `
        insert into "product_images" ("id", "productId", "url", "alt", "order")
        values ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), product.id, image.src, image.alt || wooProduct.name, index]
      )
    }

    return { status: "backfilled" as const, wooProduct, imageCount: images.length }
  } catch (error) {
    return { status: "fetch_failed" as const, error }
  }
}

async function main() {
  await db.connect()

  try {
    const products = await getProductsWithoutImages()

    console.log(`Products without images in Neon: ${products.length}`)

    if (products.length === 0) {
      return
    }

    let backfilled = 0
    let missingInWoo = 0
    let noImagesInWoo = 0
    let fetchFailed = 0

    for (const product of products) {
      const result = await backfillImages(product)

      if (result.status === "backfilled") {
        backfilled += 1
        console.log(
          `✅ Backfilled: ${product.id} - ${product.name} (${result.imageCount} images)`
        )
      } else if (result.status === "missing_in_woo") {
        missingInWoo += 1
        console.log(`⚠️ Missing in Woo: ${product.id} - ${product.name}`)
      } else if (result.status === "no_images_in_woo") {
        noImagesInWoo += 1
        console.log(`⚠️ No images in Woo: ${product.id} - ${product.name}`)
      } else if (result.status === "fetch_failed") {
        fetchFailed += 1
        console.log(`⏳ Failed fetching Woo product: ${product.id} - ${product.name}`)
      } else {
        console.log(
          `🧪 Dry run: ${product.id} - ${product.name} would receive ${result.imageCount} images`
        )
      }

      if (WOO_REQUEST_DELAY_MS > 0) {
        await sleep(WOO_REQUEST_DELAY_MS)
      }
    }

    console.log(
      dryRun
        ? `Dry run complete. Products inspected: ${products.length}`
        : `Backfill complete. Backfilled: ${backfilled}, missing in Woo: ${missingInWoo}, no images in Woo: ${noImagesInWoo}, fetch failed: ${fetchFailed}`
    )
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error("❌ Backfill failed:", error)
  process.exit(1)
})
