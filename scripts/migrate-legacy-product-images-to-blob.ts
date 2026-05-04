import dotenv from "dotenv"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { Client } from "pg"
import { put } from "@vercel/blob"

dotenv.config({ path: ".env" })

const ENV_FILE = ".env"
const LEGACY_PREFIX =
  process.env.LEGACY_IMAGE_PREFIX ||
  "https://elpanatucasa.com.ar/wp-content/uploads/"
const REQUEST_DELAY_MS = Number.parseInt(
  process.env.LEGACY_IMAGE_REQUEST_DELAY_MS || "250",
  10
)

const dryRun = process.argv.includes("--dry-run")
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] || "0", 10) : 0

type DbImageRow = {
  id: string
  productId: string
  url: string
  alt: string | null
  order: number
}

function readCommentedEnvValue(name: string) {
  const envContent = fs.readFileSync(ENV_FILE, "utf8")
  const match = envContent.match(
    new RegExp(`^#\\s*${name}=(?:"([^"]+)"|([^\\n#]+))(?:\\s+#.*)?$`, "m")
  )

  if (!match) {
    return null
  }

  return (match[1] || match[2] || "")
    .trim()
    .replace(/^"/, "")
    .replace(/"$/, "")
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    readCommentedEnvValue("BLOB_READ_WRITE_TOKEN")
  )
}

function buildBlobPath(row: DbImageRow, sourceUrl: string) {
  const parsed = new URL(sourceUrl)
  const ext = path.extname(parsed.pathname) || ".jpg"
  const basename = path
    .basename(parsed.pathname, ext)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `products/legacy/${row.productId}/${row.order}-${basename || randomUUID()}${ext.toLowerCase()}`
}

function normalizeContentType(contentType: string | null, sourceUrl: string) {
  if (contentType?.trim()) {
    return contentType.split(";")[0].trim()
  }

  const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase()
  if (ext === ".png") return "image/png"
  if (ext === ".webp") return "image/webp"
  if (ext === ".gif") return "image/gif"
  if (ext === ".svg") return "image/svg+xml"
  return "image/jpeg"
}

async function withRetries<T>(fn: () => Promise<T>, label: string) {
  const delays = [1000, 2500, 5000]

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === delays.length) {
        throw error
      }
      console.warn(`Retrying ${label} after failure (attempt ${attempt + 2})`)
      await sleep(delays[attempt])
    }
  }

  throw new Error(`Unexpected retry state for ${label}`)
}

async function getLegacyImageRows(db: Client) {
  const params: unknown[] = [LEGACY_PREFIX]
  let query = `
    select
      id,
      "productId",
      url,
      alt,
      "order"
    from "product_images"
    where url like $1 || '%'
    order by url asc, "productId" asc, "order" asc
  `

  if (limit > 0) {
    params.push(limit)
    query += ` limit $2`
  }

  const result = await db.query(query, params)
  return result.rows as DbImageRow[]
}

async function fetchImageBuffer(sourceUrl: string) {
  return withRetries(async () => {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "elpan-image-migration/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${sourceUrl}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: normalizeContentType(
        response.headers.get("content-type"),
        sourceUrl
      ),
    }
  }, `fetch ${sourceUrl}`)
}

async function uploadToBlobForRow(
  row: DbImageRow,
  sourceUrl: string,
  token: string
) {
  const { buffer, contentType } = await fetchImageBuffer(sourceUrl)
  const pathname = buildBlobPath(row, sourceUrl)

  return withRetries(
    () =>
      put(pathname, buffer, {
        access: "public",
        contentType,
        token,
        addRandomSuffix: false,
      }),
    `blob upload ${sourceUrl}`
  )
}

async function main() {
  const productionDbUrl = readCommentedEnvValue("DATABASE_URL")
  if (!productionDbUrl) {
    throw new Error(`No commented production DATABASE_URL found in ${ENV_FILE}`)
  }

  const blobToken = getBlobToken()
  if (!blobToken && !dryRun) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN for Blob migration")
  }

  const db = new Client({
    connectionString: buildDirectDatabaseUrl(productionDbUrl),
  })

  await db.connect()

  try {
    const rows = await getLegacyImageRows(db)
    const uniqueUrls = new Set(rows.map((row) => row.url))
    const uploadedUrlMap = new Map<string, string>()

    console.log(`Legacy image rows found: ${rows.length}`)
    console.log(`Unique legacy source URLs: ${uniqueUrls.size}`)
    console.log(`Mode: ${dryRun ? "dry-run" : "commit"}`)

    if (rows.length === 0) {
      return
    }

    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const row of rows) {
      try {
        const existingBlobUrl = uploadedUrlMap.get(row.url)
        const targetUrl =
          existingBlobUrl ||
          (dryRun
            ? `dry-run:${buildBlobPath(row, row.url)}`
            : (
                await uploadToBlobForRow(row, row.url, blobToken as string)
              ).url)

        if (!existingBlobUrl) {
          uploadedUrlMap.set(row.url, targetUrl)
        }

        if (dryRun) {
          migrated += 1
          console.log(`🧪 ${row.productId} :: ${row.url} -> ${targetUrl}`)
        } else {
          await db.query(
            `update "product_images" set url = $1 where id = $2 and url = $3`,
            [targetUrl, row.id, row.url]
          )
          migrated += 1
          console.log(`✅ ${row.productId} :: migrated to Blob`)
        }
      } catch (error) {
        failed += 1
        console.error(`❌ Failed: ${row.productId} :: ${row.url}`)
        console.error(error)
      }

      if (REQUEST_DELAY_MS > 0) {
        await sleep(REQUEST_DELAY_MS)
      } else {
        skipped += 0
      }
    }

    console.log(
      dryRun
        ? `Dry run complete. Rows inspected: ${rows.length}, previewed: ${migrated}, failed: ${failed}`
        : `Migration complete. Rows updated: ${migrated}, failed: ${failed}, unique uploads: ${uploadedUrlMap.size}, skipped: ${skipped}`
    )
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error("❌ Legacy image migration failed:", error)
  process.exit(1)
})
