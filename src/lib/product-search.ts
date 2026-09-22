import { db } from "@/lib/db"
import { normalizeSearchQuery } from "@/lib/search"

// PostgreSQL's ILIKE is case-insensitive but does not make "budín" match
// "budin". translate avoids requiring an optional database extension.
const ACCENTED_CHARACTERS = "áàäâéèëêíìïîóòöôúùüûñç"
const PLAIN_CHARACTERS = "aaaaeeeeiiiioooouuuunc"

export async function findAccentInsensitiveProductIds(query: string) {
  const normalizedQuery = normalizeSearchQuery(query)
  if (!normalizedQuery) return []

  const pattern = `%${normalizedQuery}%`
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "products"
    WHERE translate(lower("name"), ${ACCENTED_CHARACTERS}, ${PLAIN_CHARACTERS}) LIKE ${pattern}
      OR translate(lower(COALESCE("sku", '')), ${ACCENTED_CHARACTERS}, ${PLAIN_CHARACTERS}) LIKE ${pattern}
      OR translate(lower("slug"), ${ACCENTED_CHARACTERS}, ${PLAIN_CHARACTERS}) LIKE ${pattern}
      OR translate(lower(COALESCE("description", '')), ${ACCENTED_CHARACTERS}, ${PLAIN_CHARACTERS}) LIKE ${pattern}
  `

  return rows.map((row) => row.id)
}
