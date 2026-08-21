export type PriceImportRole = "UNIT" | "COMBO"

export type PriceImportRowStatus =
  | "AUTO_MATCH"
  | "NEEDS_REVIEW"
  | "NEW_UNMATCHED"
  | "UNIT_NOT_FOUND"
  | "COMBO_NOT_FOUND"
  | "INVALID_PRICE"
  | "NO_CHANGES"
  | "IGNORED"

export type PriceImportProductOption = {
  id: string
  name: string
  price: number
  externalProviderCode: string | null
  isCombo: boolean
  sku: string | null
  relatedCombos?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

export type ParsedPriceImportRow = {
  rowNumber: number
  providerCode: string
  providerDescription: string
  unitPrice: number | null
  comboPrice: number | null
  raw: Record<string, unknown>
  errors: string[]
  warnings: string[]
}

export type PriceImportMatch = {
  productId: string | null
  productName: string | null
  currentPrice: number | null
  newPrice: number | null
  confidence: number
  matchType: "external_code" | "heuristic" | "manual" | null
  confirmed: boolean
}

export type PriceImportPreviewRow = ParsedPriceImportRow & {
  rowId: string
  status: PriceImportRowStatus
  unitMatch: PriceImportMatch
  comboMatch: PriceImportMatch
  ignored: boolean
}

export type MissingProviderProduct = {
  id: string
  name: string
  externalProviderCode: string
  price: number
}

export type PriceImportPreviewData = {
  version: 1
  rows: PriceImportPreviewRow[]
  missingProviderProducts: MissingProviderProduct[]
  productOptions: PriceImportProductOption[]
  summary: {
    totalRows: number
    autoMatches: number
    needsReview: number
    warnings: number
    errors: number
  }
}

export type PriceImportSourceProduct = PriceImportProductOption
