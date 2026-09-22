export interface SearchSuggestion {
  label: string
  href: string
}

export const SEARCH_SUGGESTIONS_MIN_QUERY_LENGTH = 2
export const SEARCH_SUGGESTIONS_LIMIT = 12

export function normalizeSearchQuery(query: string) {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

export function getProductsSearchHref(query: string) {
  const normalizedQuery = normalizeSearchQuery(query)
  const params = new URLSearchParams({ s: normalizedQuery })
  return `/products?${params.toString()}`
}
