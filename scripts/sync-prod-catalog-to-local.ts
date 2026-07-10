import dotenv from "dotenv"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Client } from "pg"

type Row = Record<string, unknown>

const LOCAL_ENV_FILE = process.env.LOCAL_ENV_FILE || ".env"
const PROD_ENV_FILE = process.env.PROD_ENV_FILE || ".env.pgi.vercel.local"

const CATALOG_TABLES = [
  "categories",
  "products",
  "product_images",
  "product_options",
  "product_variants",
  "combo_components",
] as const

const LOCAL_RESET_TABLES = [
  "route_sheet_items",
  "route_sheets",
  "order_item_components",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "combo_components",
  "product_images",
  "product_options",
  "product_variants",
  "products",
  "categories",
] as const

const dryRun = process.argv.includes("--dry-run")
const confirmed = process.argv.includes("--yes")

dotenv.config({ path: LOCAL_ENV_FILE })

function readEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  return dotenv.parse(fs.readFileSync(filePath))
}

function readCommentedEnvValue(filePath: string, key: string) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const envContent = fs.readFileSync(filePath, "utf8")
  const match = envContent.match(
    new RegExp(`^#\\s*${key}=(?:"([^"]+)"|([^\\n#]+))$`, "m")
  )

  return match ? (match[1] || match[2] || "").trim() : null
}

function unquote(value: string) {
  return value.trim().replace(/^"/, "").replace(/"$/, "")
}

function directNeonUrl(connectionString: string) {
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

function readLocalDatabaseUrl() {
  const localEnv = readEnvFile(LOCAL_ENV_FILE)
  return unquote(
    process.env.LOCAL_DATABASE_URL ||
      localEnv.DATABASE_URL ||
      process.env.DATABASE_URL ||
      ""
  )
}

function readProductionDatabaseUrl() {
  const prodEnv = readEnvFile(PROD_ENV_FILE)
  const value =
    process.env.PROD_DATABASE_URL ||
    readCommentedEnvValue(LOCAL_ENV_FILE, "DATABASE_URL") ||
    prodEnv.POSTGRES_URL_NON_POOLING ||
    prodEnv.DATABASE_URL_UNPOOLED ||
    prodEnv.DATABASE_URL ||
    ""

  if (!value) {
    return ""
  }

  const unquoted = unquote(value)
  return unquoted.includes("neon.tech") ? directNeonUrl(unquoted) : unquoted
}

function assertSafeConnections(localUrl: string, productionUrl: string) {
  if (!localUrl || !productionUrl) {
    throw new Error("Missing local or production database URL")
  }

  const local = new URL(localUrl)
  const production = new URL(productionUrl)

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
  if (!localHosts.has(local.hostname)) {
    throw new Error(`Refusing to write to non-local database: ${local.hostname}`)
  }

  if (localHosts.has(production.hostname)) {
    throw new Error("Refusing to treat localhost as production")
  }

  if (localUrl === productionUrl) {
    throw new Error("Local and production URLs are identical")
  }
}

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function countRows(client: Client, tables: readonly string[]) {
  const counts: Record<string, number> = {}

  for (const table of tables) {
    const result = await client.query(`select count(*)::int as count from ${quoteIdent(table)}`)
    counts[table] = result.rows[0].count
  }

  return counts
}

async function existingTables(client: Client, tables: readonly string[]) {
  const result = await client.query<{ table_name: string }>(
    `
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any($1)
    `,
    [tables]
  )

  return new Set(result.rows.map((row) => row.table_name))
}

async function readTable(client: Client, table: string) {
  const result = await client.query<Row>(`select * from ${quoteIdent(table)}`)
  return result.rows
}

async function backupLocalCatalog(client: Client, tables: readonly string[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join(os.tmpdir(), `ecommerce-local-catalog-backup-${timestamp}.json`)
  const backup: Record<string, Row[]> = {}

  for (const table of tables) {
    backup[table] = await readTable(client, table)
  }

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  return backupPath
}

async function insertRows(client: Client, table: string, rows: Row[]) {
  for (const row of rows) {
    const columns = Object.keys(row)
    const placeholders = columns.map((_, index) => `$${index + 1}`)
    const values = columns.map((column) => row[column])

    await client.query(
      `
      insert into ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
      values (${placeholders.join(", ")})
      `,
      values
    )
  }
}

async function main() {
  const localUrl = readLocalDatabaseUrl()
  const productionUrl = readProductionDatabaseUrl()

  assertSafeConnections(localUrl, productionUrl)

  if (!dryRun && !confirmed) {
    throw new Error("Missing --yes. Run with --dry-run first, then --yes to write locally.")
  }

  const source = new Client({ connectionString: productionUrl })
  const target = new Client({ connectionString: localUrl })

  await source.connect()
  await target.connect()

  try {
    const sourceExisting = await existingTables(source, CATALOG_TABLES)
    const targetExisting = await existingTables(target, LOCAL_RESET_TABLES)
    const sourceCatalogTables = CATALOG_TABLES.filter((table) => sourceExisting.has(table))
    const targetResetTables = LOCAL_RESET_TABLES.filter((table) => targetExisting.has(table))
    const missingSourceCatalogTables = CATALOG_TABLES.filter(
      (table) => !sourceExisting.has(table)
    )

    const [sourceCounts, targetCounts] = await Promise.all([
      countRows(source, sourceCatalogTables),
      countRows(target, targetResetTables),
    ])

    console.log("Source production catalog counts:", sourceCounts)
    console.log("Current local reset-table counts:", targetCounts)
    if (missingSourceCatalogTables.length > 0) {
      console.log("Source tables not present, skipped:", missingSourceCatalogTables)
    }

    if (dryRun) {
      console.log("Dry run complete. No local data was changed.")
      return
    }

    const backupPath = await backupLocalCatalog(target, targetResetTables)
    console.log(`Local backup written to ${backupPath}`)

    await target.query("begin")

    const truncateList = targetResetTables.map(quoteIdent).join(", ")
    await target.query(`truncate table ${truncateList} restart identity cascade`)

    for (const table of sourceCatalogTables) {
      const rows = await readTable(source, table)
      await insertRows(target, table, rows)
      console.log(`Copied ${rows.length} rows into ${table}`)
    }

    await target.query("commit")

    const finalCounts = await countRows(target, CATALOG_TABLES)
    console.log("Final local catalog counts:", finalCounts)
  } catch (error) {
    await target.query("rollback").catch(() => null)
    throw error
  } finally {
    await source.end()
    await target.end()
  }
}

main().catch((error) => {
  console.error("Catalog sync failed:", error)
  process.exit(1)
})
