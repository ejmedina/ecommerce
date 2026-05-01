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
  popularity: number
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? ""
  const query = normalizeSearchQuery(rawQuery)

  if (query.length < SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH) {
    return NextResponse.json({ suggestions: [] satisfies SearchSuggestion[] })
  }

  try {
    const rows = await db.$queryRaw<SearchSuggestionRow[]>`
      SELECT
        p."name",
        p."slug",
        COALESCE(SUM(oi."quantityOrdered"), 0)::int AS "popularity"
      FROM "products" p
      LEFT JOIN "order_items" oi ON oi."productId" = p."id"
      WHERE p."isActive" = true
        AND p."name" ILIKE ${`%${query}%`}
      GROUP BY p."id", p."name", p."slug", p."createdAt"
      ORDER BY
        CASE
          WHEN LOWER(p."name") = LOWER(${query}) THEN 0
          WHEN LOWER(p."name") LIKE LOWER(${`${query}%`}) THEN 1
          ELSE 2
        END,
        COALESCE(SUM(oi."quantityOrdered"), 0) DESC,
        CHAR_LENGTH(p."name") ASC,
        p."createdAt" DESC
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
