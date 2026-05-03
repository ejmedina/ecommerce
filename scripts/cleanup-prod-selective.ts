import dotenv from "dotenv"
import fs from "node:fs"
import { Client } from "pg"

dotenv.config({ path: ".env" })

const ADMIN_EMAIL = "ejmedina@gmail.com"
const ENV_FILE = process.env.CLEANUP_ENV_FILE || ".env"

function assertConfirmed() {
  const confirmed =
    process.argv.includes("--yes") &&
    process.env.CONFIRM_PROD_CLEANUP === "YES_I_KNOW"

  if (!confirmed) {
    throw new Error(
      "Missing confirmation. Run with --yes and CONFIRM_PROD_CLEANUP=YES_I_KNOW."
    )
  }
}

async function main() {
  assertConfirmed()

  const connectionString = getProductionDatabaseUrl()

  if (!connectionString) {
    throw new Error(`No production database URL found in ${ENV_FILE}`)
  }

  if (connectionString.includes("localhost")) {
    throw new Error("Refusing to run against a local database connection")
  }

  const client = new Client({ connectionString })

  await client.connect()

  try {
    const before = await client.query(`
      select
        (select count(*) from "users") as users,
        (select count(*) from "products") as products,
        (select count(*) from "categories") as categories,
        (select count(*) from "orders") as orders,
        (select count(*) from "route_sheets") as route_sheets
    `)

    console.log("Current production counts:", before.rows[0])

    const adminRes = await client.query(
      `select id, email from "users" where email = $1 limit 1`,
      [ADMIN_EMAIL]
    )

    if (adminRes.rowCount === 0) {
      throw new Error(`Admin user not found: ${ADMIN_EMAIL}`)
    }

    const adminId = adminRes.rows[0].id as string

    console.log(`Found admin user: ${ADMIN_EMAIL}`)
    console.log("Cleaning production data...")
    console.log("Will keep only the admin user and remove:")
    console.log("- all route sheets")
    console.log("- all orders")
    console.log("- all products and categories")
    console.log("- all users except the admin")

    await client.query("begin")

    await client.query('delete from "route_sheets"')
    await client.query('delete from "order_items"')
    await client.query('delete from "orders"')
    await client.query('delete from "cart_items"')
    await client.query('delete from "carts"')
    await client.query('delete from "audit_logs"')
    await client.query('delete from "product_images"')
    await client.query('delete from "product_variants"')
    await client.query('delete from "product_options"')
    await client.query('delete from "products"')
    await client.query('delete from "categories"')

    await client.query(
      `delete from "users" where email <> $1`,
      [ADMIN_EMAIL]
    )

    await client.query(
      `update "users"
       set "role" = 'ADMIN',
           "status" = 'ACTIVE',
           "isActive" = true,
           "updatedAt" = now()
       where id = $1`,
      [adminId]
    )

    await client.query("commit")

    const counts = await client.query(`
      select
        (select count(*) from "users") as users,
        (select count(*) from "products") as products,
        (select count(*) from "categories") as categories,
        (select count(*) from "orders") as orders,
        (select count(*) from "route_sheets") as route_sheets
    `)

    console.log("Cleanup complete:", counts.rows[0])
  } catch (error) {
    await client.query("rollback").catch(() => null)
    throw error
  } finally {
    await client.end()
  }
}

function unquote(value: string) {
  return value.trim().replace(/^"/, "").replace(/"$/, "")
}

function getProductionDatabaseUrl() {
  const envContent = fs.readFileSync(ENV_FILE, "utf8")
  const commentedUrl = envContent.match(
    /^#\s*DATABASE_URL=(?:"([^"]+)"|([^\n#]+))$/m
  )

  if (commentedUrl) {
    return unquote(commentedUrl[1] || commentedUrl[2] || "")
  }

  const directUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING
  return directUrl ? unquote(directUrl) : null
}

main().catch((error) => {
  console.error("Cleanup failed:", error)
  process.exit(1)
})
