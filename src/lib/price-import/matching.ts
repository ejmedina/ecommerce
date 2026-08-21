import type {
  MissingProviderProduct,
  ParsedPriceImportRow,
  PriceImportMatch,
  PriceImportPreviewData,
  PriceImportPreviewRow,
  PriceImportRowStatus,
  PriceImportSourceProduct,
} from "./types"

const COMBO_PATTERNS = [
  /\bx\s*2\b/i,
  /\bx2\b/i,
  /\bcombo\b/i,
  /\b2\s*unidades\b/i,
  /\bpack\s*2\b/i,
]

export function buildPriceImportPreview(
  rows: ParsedPriceImportRow[],
  products: PriceImportSourceProduct[]
): PriceImportPreviewData {
  const productsByCode = groupProductsByExternalCode(products)
  const uploadedCodes = new Set(rows.map((row) => row.providerCode).filter(Boolean))
  const previewRows = rows.map((row, index) =>
    buildPreviewRow(row, index, products, productsByCode.get(row.providerCode) || [])
  )
  const missingProviderProducts = findMissingProviderProducts(products, uploadedCodes)
  const warningRows = previewRows.filter((row) => row.warnings.length > 0).length
  const errorRows = previewRows.filter((row) => row.errors.length > 0).length

  return {
    version: 1,
    rows: previewRows,
    missingProviderProducts,
    productOptions: products,
    summary: {
      totalRows: previewRows.length,
      autoMatches: previewRows.filter((row) => row.status === "AUTO_MATCH").length,
      needsReview: previewRows.filter((row) => row.status === "NEEDS_REVIEW").length,
      warnings: warningRows + missingProviderProducts.length,
      errors: errorRows,
    },
  }
}

export function isComboCandidate(productName: string) {
  return COMBO_PATTERNS.some((pattern) => pattern.test(productName))
}

export function priceImportStatusLabel(status: PriceImportRowStatus) {
  const labels: Record<PriceImportRowStatus, string> = {
    AUTO_MATCH: "Match automático",
    NEEDS_REVIEW: "Requiere revisión",
    NEW_UNMATCHED: "Producto nuevo / sin match",
    UNIT_NOT_FOUND: "Producto unitario no encontrado",
    COMBO_NOT_FOUND: "Combo no encontrado",
    INVALID_PRICE: "Precio inválido",
    NO_CHANGES: "Sin cambios",
    IGNORED: "Fila ignorada",
  }

  return labels[status]
}

export function canApplyPreviewRow(row: PriceImportPreviewRow) {
  return (
    !row.ignored &&
    row.errors.length === 0 &&
    row.status !== "INVALID_PRICE" &&
    row.status !== "NEW_UNMATCHED" &&
    row.status !== "UNIT_NOT_FOUND" &&
    row.status !== "COMBO_NOT_FOUND" &&
    row.unitMatch.productId !== null &&
    row.comboMatch.productId !== null &&
    row.unitMatch.confirmed &&
    row.comboMatch.confirmed
  )
}

function buildPreviewRow(
  row: ParsedPriceImportRow,
  index: number,
  products: PriceImportSourceProduct[],
  productsWithCode: PriceImportSourceProduct[]
): PriceImportPreviewRow {
  const unitEmptyMatch = emptyMatch(row.unitPrice)
  const comboEmptyMatch = emptyMatch(row.comboPrice)

  if (row.errors.length > 0) {
    return {
      ...row,
      rowId: makeRowId(row, index),
      status: "INVALID_PRICE",
      unitMatch: unitEmptyMatch,
      comboMatch: comboEmptyMatch,
      ignored: false,
    }
  }

  const duplicateCode = row.warnings.some((warning) => warning.includes("duplicado"))

  if (productsWithCode.length >= 3) {
    return {
      ...row,
      warnings: [...row.warnings, "Hay 3 o más productos con este Código proveedor. Requiere revisión manual."],
      rowId: makeRowId(row, index),
      status: "NEEDS_REVIEW",
      unitMatch: bestExternalCodeMatch(productsWithCode, row.unitPrice, false, false),
      comboMatch: bestExternalCodeMatch(productsWithCode, row.comboPrice, true, false),
      ignored: false,
    }
  }

  if (productsWithCode.length > 0) {
    const unitMatch = bestExternalCodeMatch(productsWithCode, row.unitPrice, false, !duplicateCode)
    const comboMatch = bestExternalCodeMatch(productsWithCode, row.comboPrice, true, !duplicateCode)

    if (!unitMatch.productId) {
      return {
        ...row,
        rowId: makeRowId(row, index),
        status: "UNIT_NOT_FOUND",
        unitMatch,
        comboMatch,
        ignored: false,
      }
    }

    if (!comboMatch.productId) {
      return {
        ...row,
        rowId: makeRowId(row, index),
        status: "COMBO_NOT_FOUND",
        unitMatch,
        comboMatch,
        ignored: false,
      }
    }

    const status: PriceImportRowStatus =
      duplicateCode || !unitMatch.confirmed || !comboMatch.confirmed
        ? "NEEDS_REVIEW"
        : isSamePrice(unitMatch.currentPrice, unitMatch.newPrice) &&
            isSamePrice(comboMatch.currentPrice, comboMatch.newPrice)
          ? "NO_CHANGES"
          : "AUTO_MATCH"

    return {
      ...row,
      rowId: makeRowId(row, index),
      status,
      unitMatch,
      comboMatch,
      ignored: false,
    }
  }

  const unitSuggestion = bestHeuristicMatch(row, products, false)
  const comboSuggestion = bestHeuristicMatch(row, products, true)
  const hasSuggestion = unitSuggestion.productId || comboSuggestion.productId

  return {
    ...row,
    rowId: makeRowId(row, index),
    status: hasSuggestion ? "NEEDS_REVIEW" : "NEW_UNMATCHED",
    unitMatch: unitSuggestion,
    comboMatch: comboSuggestion,
    ignored: false,
  }
}

function makeRowId(row: ParsedPriceImportRow, index: number) {
  return `row-${row.rowNumber}-${index}`
}

function bestExternalCodeMatch(
  products: PriceImportSourceProduct[],
  newPrice: number | null,
  combo: boolean,
  confirmed: boolean
): PriceImportMatch {
  const candidates = products.filter((product) => isProductCombo(product) === combo)
  const product = candidates[0] || null
  if (!product) return emptyMatch(newPrice)

  return {
    productId: product.id,
    productName: product.name,
    currentPrice: product.price,
    newPrice,
    confidence: 100,
    matchType: "external_code",
    confirmed,
  }
}

function bestHeuristicMatch(
  row: ParsedPriceImportRow,
  products: PriceImportSourceProduct[],
  combo: boolean
): PriceImportMatch {
  const targetPrice = combo ? row.comboPrice : row.unitPrice
  const candidates = products.filter((product) => isProductCombo(product) === combo)
  let best: { product: PriceImportSourceProduct; score: number } | null = null

  for (const product of candidates) {
    const score = scoreHeuristicMatch(row.providerDescription, targetPrice, product)
    if (!best || score > best.score) {
      best = { product, score }
    }
  }

  if (!best || best.score < 45) {
    return emptyMatch(targetPrice)
  }

  return {
    productId: best.product.id,
    productName: best.product.name,
    currentPrice: best.product.price,
    newPrice: targetPrice,
    confidence: best.score,
    matchType: "heuristic",
    confirmed: false,
  }
}

function scoreHeuristicMatch(
  providerDescription: string,
  targetPrice: number | null,
  product: PriceImportSourceProduct
) {
  const textScore = tokenSimilarity(providerDescription, product.name) * 70
  const priceScore = targetPrice ? priceSimilarity(targetPrice, product.price) * 30 : 0
  return Math.round(textScore + priceScore)
}

function tokenSimilarity(a: string, b: string) {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  if (left.size === 0 || right.size === 0) return 0

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection += 1
  }

  return intersection / new Set([...left, ...right]).size
}

function priceSimilarity(target: number, current: number) {
  if (target <= 0 || current <= 0) return 0
  const delta = Math.abs(target - current) / target
  return Math.max(0, 1 - Math.min(delta, 1))
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1)
}

function isProductCombo(product: PriceImportSourceProduct) {
  return product.isCombo || isComboCandidate(product.name)
}

function emptyMatch(newPrice: number | null): PriceImportMatch {
  return {
    productId: null,
    productName: null,
    currentPrice: null,
    newPrice,
    confidence: 0,
    matchType: null,
    confirmed: false,
  }
}

function isSamePrice(a: number | null, b: number | null) {
  if (a === null || b === null) return false
  return Math.round(a * 100) === Math.round(b * 100)
}

function groupProductsByExternalCode(products: PriceImportSourceProduct[]) {
  const map = new Map<string, PriceImportSourceProduct[]>()

  for (const product of products) {
    if (!product.externalProviderCode) continue
    const productsForCode = map.get(product.externalProviderCode) || []
    productsForCode.push(product)
    map.set(product.externalProviderCode, productsForCode)
  }

  return map
}

function findMissingProviderProducts(
  products: PriceImportSourceProduct[],
  uploadedCodes: Set<string>
): MissingProviderProduct[] {
  return products
    .filter((product) => {
      return product.externalProviderCode && !uploadedCodes.has(product.externalProviderCode)
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      externalProviderCode: product.externalProviderCode!,
      price: product.price,
    }))
}
