import dotenv from "dotenv"
import fs from "node:fs"
import { randomUUID } from "node:crypto"
import { Client } from "pg"
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"
import {
  buildAddressKey,
  buildUserImportCandidate,
  dedupeCandidatesByEmail,
  maskEmail,
  type ParsedWooAddress,
  type UserImportCandidate,
  type WooCustomer,
} from "../src/lib/woo-user-migration"

dotenv.config({ path: ".env" })

const ENV_FILE = ".env"
const DEFAULT_DELAY_MS = Number.parseInt(process.env.WOO_REQUEST_DELAY_MS || "500", 10)
const CUSTOMERS_PER_PAGE = Number.parseInt(process.env.WOO_CUSTOMERS_PER_PAGE || "50", 10)
const DRY_RUN = !process.argv.includes("--commit")
const USE_PROD_DB = process.argv.includes("--prod")
const WOO_RETRY_DELAYS_MS = [1500, 4000, 8000]

type ExistingUserRow = {
  id: string
  email: string
  name: string | null
  phone: string | null
}

type ExistingAddressRow = {
  street: string
  number: string
  city: string
  state: string
  postalCode: string
  country: string
  instructions: string | null
}

type MigrationStats = {
  totalRead: number
  excludedElevatedRole: number
  excludedNonCustomerRole: number
  excludedMissingReliableLastLogin: number
  excludedStaleLastLogin: number
  invalidEmail: number
  duplicateEmails: number
  existingUsers: number
  newUsersToImport: number
  usersEnriched: number
  addressesInserted: number
  usersCreated: number
}

function readCommentedProductionDatabaseUrl() {
  const envContent = fs.readFileSync(ENV_FILE, "utf8")
  const match = envContent.match(/^#\s*DATABASE_URL=(?:"([^"]+)"|([^\n#]+))$/m)

  if (!match) {
    throw new Error(`No commented production DATABASE_URL found in ${ENV_FILE}`)
  }

  return (match[1] || match[2] || "").trim().replace(/^"/, "").replace(/"$/, "")
}

function buildDirectDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString)
  const isLocalDatabase = ["localhost", "127.0.0.1"].includes(url.hostname)

  if (!isLocalDatabase) {
    url.hostname = url.hostname.replace(/-pooler(?=\.)/, "")
    url.searchParams.delete("pgbouncer")
    url.searchParams.delete("connection_limit")
    url.searchParams.delete("pool_timeout")
    url.searchParams.delete("channel_binding")
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require")
    }
  }

  return url.toString()
}

function resolveDatabaseUrl() {
  const source = USE_PROD_DB
    ? readCommentedProductionDatabaseUrl()
    : process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL

  if (!source) {
    throw new Error("Missing DATABASE_URL/POSTGRES_URL_NON_POOLING in environment")
  }

  return buildDirectDatabaseUrl(source)
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryWooRequest(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
      ? error.response.status
      : null

  return status === 429 || status === 503
}

async function fetchWooCustomersPage(api: WooCommerceRestApi, page: number) {
  let attempt = 0

  while (true) {
    try {
      return await api.get("customers", {
        per_page: CUSTOMERS_PER_PAGE,
        page,
        orderby: "id",
        order: "asc",
      })
    } catch (error) {
      if (!shouldRetryWooRequest(error) || attempt >= WOO_RETRY_DELAYS_MS.length) {
        throw error
      }

      const retryDelay = WOO_RETRY_DELAYS_MS[attempt]
      console.warn(`Woo customers page ${page} responded with a temporary error. Retrying in ${retryDelay}ms...`)
      await sleep(retryDelay)
      attempt += 1
    }
  }
}

function summarizeCandidate(candidate: UserImportCandidate) {
  return {
    sourceId: candidate.sourceId,
    email: candidate.normalizedEmail ? maskEmail(candidate.normalizedEmail) : null,
    decision: candidate.decision,
    role: candidate.role,
    lastActiveAt: candidate.lastActiveAt?.toISOString() || null,
    lastActiveField: candidate.lastActiveField,
    addressCount: candidate.addresses.length,
  }
}

function dedupeKeyFromAddressRow(address: ExistingAddressRow) {
  return buildAddressKey([
    address.street,
    address.number,
    address.city,
    address.state,
    address.postalCode,
    address.country,
    address.instructions,
  ])
}

async function fetchAllWooCustomers(api: WooCommerceRestApi) {
  const customers: WooCustomer[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await fetchWooCustomersPage(api, page)

    const pageCustomers = response.data as WooCustomer[]
    customers.push(...pageCustomers)

    const headerValue = response.headers["x-wp-totalpages"]
    totalPages = Number.parseInt(Array.isArray(headerValue) ? headerValue[0] : headerValue || "1", 10) || 1

    console.log(`Fetched Woo customers page ${page}/${totalPages} (${pageCustomers.length} registros)`)

    page += 1
    if (page <= totalPages) {
      await sleep(DEFAULT_DELAY_MS)
    }
  }

  return customers
}

async function loadExistingUsers(client: Client, emails: string[]) {
  const users = new Map<string, ExistingUserRow>()

  for (const emailChunk of chunk(emails, 200)) {
    const result = await client.query<ExistingUserRow>(
      `
      select "id", "email", "name", "phone"
      from "users"
      where "email" = any($1::text[])
      `,
      [emailChunk]
    )

    for (const row of result.rows) {
      users.set(row.email, row)
    }
  }

  return users
}

async function loadExistingAddressKeys(client: Client, userId: string) {
  const result = await client.query<ExistingAddressRow>(
    `
    select "street", "number", "city", "state", "postalCode", "country", "instructions"
    from "addresses"
    where "userId" = $1
    `,
    [userId]
  )

  return new Set(result.rows.map(dedupeKeyFromAddressRow))
}

async function enrichExistingUser(
  client: Client,
  existingUser: ExistingUserRow,
  candidate: UserImportCandidate,
) {
  let changed = false

  const nextName = (!existingUser.name || existingUser.name.trim().length === 0) ? candidate.name : existingUser.name
  const nextPhone = (!existingUser.phone || existingUser.phone.trim().length === 0) ? candidate.phone : existingUser.phone

  if (nextName !== existingUser.name || nextPhone !== existingUser.phone) {
    await client.query(
      `
      update "users"
      set "name" = $2,
          "phone" = $3,
          "updatedAt" = now()
      where "id" = $1
      `,
      [existingUser.id, nextName, nextPhone]
    )
    changed = true
  }

  const existingAddressKeys = await loadExistingAddressKeys(client, existingUser.id)
  const insertedAddresses = await insertMissingAddresses(client, existingUser.id, candidate.addresses, existingAddressKeys)

  return {
    changed: changed || insertedAddresses > 0,
    insertedAddresses,
  }
}

async function createMigratedUser(client: Client, candidate: UserImportCandidate) {
  const userId = randomUUID()

  await client.query(
    `
    insert into "users" (
      "id",
      "email",
      "passwordHash",
      "name",
      "phone",
      "role",
      "status",
      "isActive",
      "emailVerifiedAt",
      "importedFromWooCommerce",
      "requiresPasswordSetup",
      "legacyWooUserId",
      "legacyWooCustomerId",
      "legacyWooLastActiveAt",
      "legacyWooLastActiveField",
      "importedAt",
      "createdAt",
      "updatedAt"
    ) values (
      $1,
      $2,
      null,
      $3,
      $4,
      'CUSTOMER',
      'ACTIVE',
      false,
      null,
      true,
      true,
      $5,
      $6,
      $7,
      $8,
      now(),
      now(),
      now()
    )
    `,
    [
      userId,
      candidate.normalizedEmail,
      candidate.name,
      candidate.phone,
      candidate.sourceId,
      candidate.sourceId,
      candidate.lastActiveAt,
      candidate.lastActiveField,
    ]
  )

  const insertedAddresses = await insertMissingAddresses(client, userId, candidate.addresses, new Set<string>())

  return {
    userId,
    insertedAddresses,
  }
}

async function insertMissingAddresses(
  client: Client,
  userId: string,
  addresses: ParsedWooAddress[],
  existingKeys: Set<string>,
) {
  let inserted = 0

  for (const address of addresses) {
    if (existingKeys.has(address.dedupeKey)) {
      continue
    }

    const isDefault = existingKeys.size === 0 && inserted === 0

    await client.query(
      `
      insert into "addresses" (
        "id",
        "userId",
        "label",
        "street",
        "number",
        "floor",
        "apartment",
        "city",
        "state",
        "postalCode",
        "country",
        "instructions",
        "isDefault",
        "source",
        "importedAt",
        "legacySourceKey",
        "createdAt",
        "updatedAt"
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), $15, now(), now()
      )
      `,
      [
        randomUUID(),
        userId,
        address.label,
        address.street,
        address.number,
        address.floor,
        address.apartment,
        address.city,
        address.state,
        address.postalCode,
        address.country,
        address.instructions,
        isDefault,
        address.source,
        address.legacySourceKey,
      ]
    )

    existingKeys.add(address.dedupeKey)
    inserted += 1
  }

  return inserted
}

async function main() {
  if (!process.env.WOO_URL || !process.env.WOO_KEY || !process.env.WOO_SECRET) {
    throw new Error("Missing WOO_URL, WOO_KEY or WOO_SECRET in .env")
  }

  const databaseUrl = resolveDatabaseUrl()

  const api = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_KEY,
    consumerSecret: process.env.WOO_SECRET,
    version: "wc/v3",
  })

  const client = new Client({
    connectionString: databaseUrl,
  })

  const stats: MigrationStats = {
    totalRead: 0,
    excludedElevatedRole: 0,
    excludedNonCustomerRole: 0,
    excludedMissingReliableLastLogin: 0,
    excludedStaleLastLogin: 0,
    invalidEmail: 0,
    duplicateEmails: 0,
    existingUsers: 0,
    newUsersToImport: 0,
    usersEnriched: 0,
    addressesInserted: 0,
    usersCreated: 0,
  }

  const rawCustomers = await fetchAllWooCustomers(api)
  stats.totalRead = rawCustomers.length

  const sourceCandidates = rawCustomers.map(buildUserImportCandidate)
  const excludedWithoutEmail = sourceCandidates.filter((candidate) => !candidate.normalizedEmail)

  for (const candidate of excludedWithoutEmail) {
    if (candidate.decision === "exclude_invalid_email") {
      stats.invalidEmail += 1
    }
  }

  const { uniqueCandidates: finalCandidates, duplicateEmails } = dedupeCandidatesByEmail(
    sourceCandidates.filter((entry) => entry.normalizedEmail)
  )
  stats.duplicateEmails = duplicateEmails
  const excludedCandidates = finalCandidates.filter((candidate) => candidate.decision !== "import")

  for (const candidate of excludedCandidates) {
    if (candidate.decision === "exclude_elevated_role") {
      stats.excludedElevatedRole += 1
    } else if (candidate.decision === "exclude_non_customer_role") {
      stats.excludedNonCustomerRole += 1
    } else if (candidate.decision === "exclude_missing_last_login") {
      stats.excludedMissingReliableLastLogin += 1
    } else if (candidate.decision === "exclude_stale_last_login") {
      stats.excludedStaleLastLogin += 1
    }
  }

  const importableCandidates = finalCandidates.filter((candidate) => candidate.decision === "import")
  await client.connect()

  try {
    const existingUsers = await loadExistingUsers(
      client,
      importableCandidates
        .map((candidate) => candidate.normalizedEmail)
        .filter((email): email is string => Boolean(email))
    )

    stats.existingUsers = importableCandidates.filter((candidate) => existingUsers.has(candidate.normalizedEmail as string)).length
    stats.newUsersToImport = importableCandidates.length - stats.existingUsers

    console.log("")
    console.log("WooCommerce user migration")
    console.log("==========================")
    console.log(`Mode: ${DRY_RUN ? "dry-run" : "commit"}`)
    console.log(`Database: ${USE_PROD_DB ? "commented PROD database from .env" : "current DATABASE_URL / POSTGRES_URL_NON_POOLING"}`)
    console.log('Reliable last login field detection: trying "wc_last_active" first, then fallback candidates (last_login, last_login_at, _last_login, wp_last_login, wp-last-login).')
    console.log("")
    console.log(`Total users read from WooCommerce: ${stats.totalRead}`)
    console.log(`Excluded by elevated/admin role: ${stats.excludedElevatedRole}`)
    console.log(`Excluded by non-customer role: ${stats.excludedNonCustomerRole}`)
    console.log(
      `Excluded without reliable last login within the last year: ${
        stats.excludedMissingReliableLastLogin + stats.excludedStaleLastLogin
      }`
    )
    console.log(`Excluded without reliable last login: ${stats.excludedMissingReliableLastLogin}`)
    console.log(`Excluded with last login before 2025-05-03: ${stats.excludedStaleLastLogin}`)
    console.log(`Invalid/missing email: ${stats.invalidEmail}`)
    console.log(`Duplicate emails in source: ${stats.duplicateEmails}`)
    console.log(`Existing users in target DB: ${stats.existingUsers}`)
    console.log(`Users that would be created: ${stats.newUsersToImport}`)
    console.log("")
    console.log("Preview of importable users:")
    console.table(importableCandidates.slice(0, 8).map(summarizeCandidate))
    console.log("Preview of users excluded for missing reliable last login:")
    console.table(
      finalCandidates
        .filter((candidate) => candidate.decision === "exclude_missing_last_login")
        .slice(0, 8)
        .map(summarizeCandidate)
    )

    if (DRY_RUN) {
      return
    }

    await client.query("begin")

    for (const candidate of importableCandidates) {
      const existingUser = existingUsers.get(candidate.normalizedEmail as string)

      if (existingUser) {
        const result = await enrichExistingUser(client, existingUser, candidate)
        if (result.changed) {
          stats.usersEnriched += 1
        }
        stats.addressesInserted += result.insertedAddresses
        console.log(`↺ Existing user kept: ${maskEmail(candidate.normalizedEmail as string)} (${result.insertedAddresses} direcciones nuevas)`)
        continue
      }

      const created = await createMigratedUser(client, candidate)
      stats.usersCreated += 1
      stats.addressesInserted += created.insertedAddresses
      console.log(`+ Migrated user: ${maskEmail(candidate.normalizedEmail as string)} (${created.insertedAddresses} direcciones)`)
    }

    await client.query("commit")
    console.log("")
    console.log("Import completed")
    console.log(`Users created: ${stats.usersCreated}`)
    console.log(`Existing users enriched: ${stats.usersEnriched}`)
    console.log(`Addresses inserted: ${stats.addressesInserted}`)
  } catch (error) {
    if (!DRY_RUN) {
      await client.query("rollback").catch(() => null)
    }
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error("Woo user migration failed:", error)
  process.exit(1)
})
