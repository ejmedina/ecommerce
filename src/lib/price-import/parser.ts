import * as XLSX from "xlsx"
import type { ParsedPriceImportRow } from "./types"

type ColumnKey = "providerCode" | "providerDescription" | "unitPrice" | "comboPrice"

const REQUIRED_COLUMNS: Array<{ key: ColumnKey; label: string; aliases: string[] }> = [
  { key: "providerCode", label: "Codigo", aliases: ["codigo", "codigoproveedor"] },
  { key: "providerDescription", label: "Descripcion", aliases: ["descripcion", "descripcionproveedor"] },
  {
    key: "unitPrice",
    label: "Lista",
    aliases: ["lista", "preciolista", "preciounitario", "preciounidad"],
  },
  {
    key: "comboPrice",
    label: "Redondeo Combo x 2",
    aliases: ["redondeocombox2", "redondeocombo2", "combox2", "preciox2", "preciocombox2"],
  },
]

export type ParsePriceImportResult = {
  rows: ParsedPriceImportRow[]
  errors: string[]
}

export function parsePriceImportWorkbook(buffer: ArrayBuffer, filename: string): ParsePriceImportResult {
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    cellDates: false,
  })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { rows: [], errors: ["El archivo no contiene hojas para analizar."] }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const table = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  })

  if (table.length === 0) {
    return { rows: [], errors: ["El archivo está vacío."] }
  }

  const headerRowIndex = findHeaderRowIndex(table)

  if (headerRowIndex === -1) {
    return {
      rows: [],
      errors: [
        `Faltan columnas requeridas: ${REQUIRED_COLUMNS.map((column) => column.label).join(", ")}.`,
      ],
    }
  }

  const headers = table[headerRowIndex].map((value) => String(value ?? ""))
  const columnIndexes = resolveColumnIndexes(headers)
  const missingColumns = REQUIRED_COLUMNS.filter(({ key }) => columnIndexes[key] === undefined)

  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [
        `Faltan columnas requeridas: ${missingColumns.map((column) => column.label).join(", ")}.`,
      ],
    }
  }

  const rows = table.slice(headerRowIndex + 1)
  if (rows.length === 0) {
    return { rows: [], errors: ["El archivo no contiene filas de precios."] }
  }

  const parsedRows = rows
    .map((row, index) => parseRow(row, index + 2, headers, columnIndexes))
    .filter((row) => {
      return (
        row.providerCode ||
        row.providerDescription ||
        row.unitPrice !== null ||
        row.comboPrice !== null
      )
    })

  if (parsedRows.length === 0) {
    return { rows: [], errors: [`${filename} no contiene filas de precios válidas para analizar.`] }
  }

  annotateDuplicateCodes(parsedRows)

  return { rows: parsedRows, errors: [] }
}

export function parseImportedPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null

  const input = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/ARS/gi, "")

  if (!input) return null

  const negative = input.startsWith("-")
  const unsigned = input.replace(/^-/, "")
  const commaIndex = unsigned.lastIndexOf(",")
  const dotIndex = unsigned.lastIndexOf(".")
  let normalized = unsigned

  if (commaIndex >= 0 && dotIndex >= 0) {
    const commaIsDecimal = commaIndex > dotIndex
    normalized = commaIsDecimal
      ? unsigned.replace(/\./g, "").replace(",", ".")
      : unsigned.replace(/,/g, "")
  } else if (commaIndex >= 0) {
    const decimals = unsigned.length - commaIndex - 1
    normalized = decimals === 2 ? unsigned.replace(/\./g, "").replace(",", ".") : unsigned.replace(/,/g, "")
  } else if (dotIndex >= 0) {
    const dots = unsigned.match(/\./g)?.length || 0
    const decimals = unsigned.length - dotIndex - 1
    normalized = dots > 1 || decimals === 3 ? unsigned.replace(/\./g, "") : unsigned
  }

  const parsed = Number.parseFloat(`${negative ? "-" : ""}${normalized}`)
  if (!Number.isFinite(parsed)) return null

  return Math.round(parsed * 100) / 100
}

function parseRow(
  row: Array<string | number | null>,
  rowNumber: number,
  headers: string[],
  columnIndexes: Partial<Record<ColumnKey, number>>
): ParsedPriceImportRow {
  const providerCode = cell(row, columnIndexes.providerCode)
  const providerDescription = cell(row, columnIndexes.providerDescription)
  const unitPrice = parseImportedPrice(cell(row, columnIndexes.unitPrice))
  const comboPrice = parseImportedPrice(cell(row, columnIndexes.comboPrice))
  const errors: string[] = []
  const warnings: string[] = []

  if (!providerCode) errors.push("Código proveedor vacío.")
  if (!providerDescription) warnings.push("Descripción proveedor vacía.")
  if (unitPrice === null) errors.push("Lista vacía o inválida.")
  if (comboPrice === null) errors.push("Redondeo Combo x 2 vacío o inválido.")
  if (unitPrice !== null && unitPrice <= 0) errors.push("Lista debe ser mayor a 0.")
  if (comboPrice !== null && comboPrice <= 0) errors.push("Redondeo Combo x 2 debe ser mayor a 0.")
  if (unitPrice !== null && comboPrice !== null && comboPrice >= unitPrice * 2) {
    warnings.push("El precio combo x2 es mayor o igual al doble del unitario.")
  }

  const raw = headers.reduce<Record<string, unknown>>((acc, header, index) => {
    acc[header || `Columna ${index + 1}`] = row[index] ?? ""
    return acc
  }, {})

  return {
    rowNumber,
    providerCode,
    providerDescription,
    unitPrice,
    comboPrice,
    raw,
    errors,
    warnings,
  }
}

function resolveColumnIndexes(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader)
  const indexes: Partial<Record<ColumnKey, number>> = {}

  for (const requiredColumn of REQUIRED_COLUMNS) {
    for (const alias of requiredColumn.aliases) {
      const index = normalizedHeaders.findIndex((header) => header === alias)
      if (index >= 0) {
        indexes[requiredColumn.key] = index
        break
      }
    }
  }

  return indexes
}

function findHeaderRowIndex(table: Array<Array<string | number | null>>) {
  return table.findIndex((row) => {
    const indexes = resolveColumnIndexes(row.map((value) => String(value ?? "")))
    return REQUIRED_COLUMNS.every(({ key }) => indexes[key] !== undefined)
  })
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

function cell(row: Array<string | number | null>, index: number | undefined) {
  if (index === undefined) return ""
  return String(row[index] ?? "").trim()
}

function annotateDuplicateCodes(rows: ParsedPriceImportRow[]) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (!row.providerCode) continue
    counts.set(row.providerCode, (counts.get(row.providerCode) || 0) + 1)
  }

  for (const row of rows) {
    if (row.providerCode && (counts.get(row.providerCode) || 0) > 1) {
      row.warnings.push("Código proveedor duplicado en la planilla.")
    }
  }
}
