import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  normalizeSearchQuery,
  SEARCH_SUGGESTIONS_LIMIT,
  SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH,
  type SearchSuggestion,
} from "@/lib/search"

interface SearchSuggestionRow {
  name: string
  slug: string
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? ""
  const query = normalizeSearchQuery(rawQuery)

  if (query.length < SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH) {
    return NextResponse.json({ suggestions: [] satisfies SearchSuggestion[] })
  }

  try {
    const rows = await db.$queryRaw<SearchSuggestionRow[]>`
      SELECT "name", "slug"
      FROM "products"
      WHERE "isActive" = true
        AND "name" ILIKE ${`%${query}%`}
      ORDER BY
        CASE
          WHEN LOWER("name") = LOWER(${query}) THEN 0
          WHEN LOWER("name") LIKE LOWER(${`${query}%`}) THEN 1
          ELSE 2
        END,
        CHAR_LENGTH("name") ASC,
        "createdAt" DESC
      LIMIT ${SEARCH_SUGGESTIONS_LIMIT}
    `

    const suggestions = rows.map((row) => ({
      label: row.name,
      href: `/products/${row.slug}`,
    }))

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("[SEARCH_SUGGESTIONS_GET]", error)
    return NextResponse.json({ suggestions: [] satisfies SearchSuggestion[] }, { status: 500 })
  }
}
