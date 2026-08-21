"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildPriceImportPreview, canApplyPreviewRow } from "@/lib/price-import/matching"
import { parsePriceImportWorkbook } from "@/lib/price-import/parser"
import { canRevertLoggedPrice } from "@/lib/price-import/rollback"
import type {
  PriceImportMatch,
  PriceImportPreviewData,
  PriceImportPreviewRow,
  PriceImportProductOption,
  PriceImportRole,
} from "@/lib/price-import/types"

async function requireAdminSession() {
  const session = await auth()

  if (!session?.user || !["SUPERADMIN", "OWNER", "ADMIN"].includes(session.user.role)) {
    throw new Error("No autorizado")
  }

  return session.user
}

export async function analyzePriceImport(formData: FormData) {
  const user = await requireAdminSession()
  const file = formData.get("file") as File | null

  if (!file || file.size === 0) {
    throw new Error("Seleccioná un archivo para analizar.")
  }

  if (!isSupportedFile(file.name)) {
    throw new Error("El archivo debe ser .xlsx, .xls o .csv.")
  }

  const parsed = parsePriceImportWorkbook(await file.arrayBuffer(), file.name)
  if (parsed.errors.length > 0) {
    const batch = await db.priceImportBatch.create({
      data: {
        filename: file.name,
        uploadedById: user.id,
        status: "FAILED",
        totalRows: 0,
        errorRows: parsed.errors.length,
        previewData: {
          version: 1,
          rows: [],
          productOptions: [],
          missingProviderProducts: [],
          summary: {
            totalRows: 0,
            autoMatches: 0,
            needsReview: 0,
            warnings: 0,
            errors: parsed.errors.length,
          },
          parseErrors: parsed.errors,
        },
      },
      select: { id: true },
    })

    redirect(`/admin/products/prices/import/${batch.id}`)
  }

  const products = await getImportProducts()
  const previewData = buildPriceImportPreview(parsed.rows, products)
  const batch = await db.priceImportBatch.create({
    data: {
      filename: file.name,
      uploadedById: user.id,
      status: "ANALYZED",
      totalRows: previewData.summary.totalRows,
      warningRows: previewData.summary.warnings,
      errorRows: previewData.summary.errors,
      previewData: previewData as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  })

  redirect(`/admin/products/prices/import/${batch.id}`)
}

export async function updateImportPreviewRow(formData: FormData) {
  await requireAdminSession()

  const batchId = getRequiredString(formData, "batchId")
  const rowId = getRequiredString(formData, "rowId")
  const intent = getRequiredString(formData, "intent")
  const batch = await getEditableBatch(batchId)
  const previewData = parsePreviewData(batch.previewData)
  const row = previewData.rows.find((candidate) => candidate.rowId === rowId)

  if (!row) {
    throw new Error("Fila de importación no encontrada.")
  }

  if (intent === "ignore") {
    row.ignored = true
    row.status = "IGNORED"
    row.unitMatch.confirmed = false
    row.comboMatch.confirmed = false
  } else {
    const unitProductId = optionalString(formData.get("unitProductId"))
    const comboProductId = optionalString(formData.get("comboProductId"))
    const unitNewPrice = optionalPrice(formData.get("unitNewPrice"), row.unitPrice)
    const comboNewPrice = optionalPrice(formData.get("comboNewPrice"), row.comboPrice)
    row.ignored = false
    row.unitMatch = buildManualMatch(previewData.productOptions, unitProductId, unitNewPrice, "UNIT")
    row.comboMatch = buildManualMatch(previewData.productOptions, comboProductId, comboNewPrice, "COMBO")
    row.status = getManualRowStatus(row)
  }

  await updateBatchPreview(batchId, previewData)
  revalidatePath(`/admin/products/prices/import/${batchId}`)
}

export async function applyPriceImportBatch(formData: FormData) {
  const user = await requireAdminSession()
  const batchId = getRequiredString(formData, "batchId")
  const batch = await getEditableBatch(batchId)
  const previewData = parsePreviewData(batch.previewData)
  const duplicateProductIds = findDuplicateSelectedProductIds(previewData.rows)
  const rowsToApply = previewData.rows.filter((row) => {
    if (!canApplyPreviewRow(row)) return false
    return !duplicateProductIds.has(row.unitMatch.productId!) && !duplicateProductIds.has(row.comboMatch.productId!)
  })

  const result = await db.$transaction(async (tx) => {
    let appliedUnitPrices = 0
    let appliedComboPrices = 0

    for (const row of rowsToApply) {
      const unitChanged = await updateProductPriceFromImport(tx, {
        batchId,
        productId: row.unitMatch.productId!,
        newPrice: row.unitMatch.newPrice!,
        externalProviderCode: row.providerCode,
        changedById: user.id,
        role: "UNIT",
      })
      const comboChanged = await updateProductPriceFromImport(tx, {
        batchId,
        productId: row.comboMatch.productId!,
        newPrice: row.comboMatch.newPrice!,
        externalProviderCode: row.providerCode,
        changedById: user.id,
        role: "COMBO",
      })

      if (unitChanged) appliedUnitPrices += 1
      if (comboChanged) appliedComboPrices += 1
    }

    const warningRows = previewData.rows.length - rowsToApply.length + previewData.missingProviderProducts.length
    await tx.priceImportBatch.update({
      where: { id: batchId },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        appliedUnitPrices,
        appliedComboPrices,
        warningRows,
        errorRows: previewData.rows.filter((row) => row.errors.length > 0).length,
        previewData: previewData as unknown as Prisma.InputJsonValue,
      },
    })

    return { appliedUnitPrices, appliedComboPrices }
  })

  revalidatePriceImportPaths(batchId)
  redirect(`/admin/products/prices/import/${batchId}?applied=1&unit=${result.appliedUnitPrices}&combo=${result.appliedComboPrices}`)
}

export async function revertPriceImportBatch(formData: FormData) {
  const user = await requireAdminSession()
  const batchId = getRequiredString(formData, "batchId")

  const batch = await db.priceImportBatch.findUnique({
    where: { id: batchId },
    include: {
      changes: {
        include: {
          product: { select: { id: true, name: true, price: true } },
        },
      },
    },
  })

  if (!batch || batch.status !== "APPLIED") {
    throw new Error("Solo se pueden revertir importaciones aplicadas.")
  }

  const summary = await db.$transaction(async (tx) => {
    const reverted: Array<{ productId: string; name: string; oldPrice: number; newPrice: number }> = []
    const conflicts: Array<{ productId: string; name: string; expectedPrice: number; currentPrice: number }> = []
    const errors: Array<{ productId: string; reason: string }> = []

    for (const change of batch.changes) {
      const product = await tx.product.findUnique({
        where: { id: change.productId },
        select: { id: true, name: true, price: true },
      })

      if (!product) {
        errors.push({ productId: change.productId, reason: "Producto no encontrado." })
        continue
      }

      const currentPrice = Number(product.price)
      const newPrice = Number(change.newPrice)
      const oldPrice = Number(change.oldPrice)

      if (!canRevertLoggedPrice(currentPrice, newPrice)) {
        conflicts.push({
          productId: product.id,
          name: product.name,
          expectedPrice: newPrice,
          currentPrice,
        })
        continue
      }

      await tx.product.update({
        where: { id: product.id },
        data: { price: oldPrice },
      })
      reverted.push({ productId: product.id, name: product.name, oldPrice, newPrice })
    }

    await tx.priceImportBatch.update({
      where: { id: batchId },
      data: {
        status: conflicts.length > 0 || errors.length > 0 ? "PARTIALLY_REVERTED" : "REVERTED",
        revertedAt: new Date(),
        revertedById: user.id,
        revertSummary: { reverted, conflicts, errors },
      },
    })

    return { reverted, conflicts, errors }
  })

  revalidatePriceImportPaths(batchId)
  redirect(`/admin/products/prices/import/${batchId}?reverted=${summary.reverted.length}&conflicts=${summary.conflicts.length}`)
}

async function getImportProducts(): Promise<PriceImportProductOption[]> {
  const products = await db.product.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      price: true,
      externalProviderCode: true,
      isCombo: true,
      sku: true,
      comboComponents: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  })

  const comboReferencesByProduct = new Map<
    string,
    Array<{ id: string; name: string; price: number; quantity: number }>
  >()

  for (const product of products) {
    if (!product.isCombo) continue

    for (const component of product.comboComponents) {
      const current = comboReferencesByProduct.get(component.productId) || []
      current.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: component.quantity,
      })
      comboReferencesByProduct.set(component.productId, current)
    }
  }

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    externalProviderCode: product.externalProviderCode,
    isCombo: product.isCombo,
    sku: product.sku,
    relatedCombos: comboReferencesByProduct.get(product.id) || [],
  }))
}

async function getEditableBatch(batchId: string) {
  const batch = await db.priceImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true, previewData: true },
  })

  if (!batch || batch.status !== "ANALYZED") {
    throw new Error("La importación no existe o ya fue aplicada.")
  }

  return batch
}

function parsePreviewData(value: Prisma.JsonValue | null): PriceImportPreviewData {
  if (!value || typeof value !== "object") {
    throw new Error("La importación no tiene datos de preview.")
  }

  return value as unknown as PriceImportPreviewData
}

function buildManualMatch(
  products: PriceImportProductOption[],
  productId: string | null,
  newPrice: number | null,
  role: PriceImportRole
): PriceImportMatch {
  if (!productId) {
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

  const product = products.find((candidate) => candidate.id === productId)
  if (!product) {
    throw new Error(`Producto ${role === "UNIT" ? "unitario" : "combo"} inválido.`)
  }

  return {
    productId: product.id,
    productName: product.name,
    currentPrice: product.price,
    newPrice,
    confidence: 100,
    matchType: "manual",
    confirmed: true,
  }
}

function getManualRowStatus(row: PriceImportPreviewRow) {
  if (!row.unitMatch.productId) return "UNIT_NOT_FOUND"
  if (!row.comboMatch.productId) return "COMBO_NOT_FOUND"
  if (row.errors.length > 0) return "INVALID_PRICE"
  if (samePrice(row.unitMatch.currentPrice, row.unitMatch.newPrice) && samePrice(row.comboMatch.currentPrice, row.comboMatch.newPrice)) {
    return "NO_CHANGES"
  }
  return "NEEDS_REVIEW"
}

async function updateBatchPreview(batchId: string, previewData: PriceImportPreviewData) {
  await db.priceImportBatch.update({
    where: { id: batchId },
    data: {
      warningRows: previewData.rows.filter((row) => row.warnings.length > 0).length + previewData.missingProviderProducts.length,
      errorRows: previewData.rows.filter((row) => row.errors.length > 0).length,
      previewData: previewData as unknown as Prisma.InputJsonValue,
    },
  })
}

async function updateProductPriceFromImport(
  tx: Pick<typeof db, "product" | "productPriceChangeLog">,
  input: {
    batchId: string
    productId: string
    newPrice: number
    externalProviderCode: string
    changedById: string
    role: PriceImportRole
  }
) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { id: true, price: true, externalProviderCode: true },
  })

  if (!product) return false

  const oldPrice = Number(product.price)
  const priceChanged = !samePrice(oldPrice, input.newPrice)

  await tx.product.update({
    where: { id: product.id },
    data: {
      price: input.newPrice,
      ...(product.externalProviderCode ? {} : { externalProviderCode: input.externalProviderCode }),
    },
  })

  if (!priceChanged) return false

  await tx.productPriceChangeLog.create({
    data: {
      importBatchId: input.batchId,
      productId: product.id,
      oldPrice,
      newPrice: input.newPrice,
      externalProviderCode: input.externalProviderCode,
      priceRole: input.role,
      changedById: input.changedById,
    },
  })

  return true
}

function findDuplicateSelectedProductIds(rows: PriceImportPreviewRow[]) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (!canApplyPreviewRow(row)) continue
    for (const productId of [row.unitMatch.productId, row.comboMatch.productId]) {
      if (!productId) continue
      counts.set(productId, (counts.get(productId) || 0) + 1)
    }
  }

  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([productId]) => productId))
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Falta ${key}.`)
  }
  return value.trim()
}

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function optionalPrice(value: FormDataEntryValue | null, fallback: number | null) {
  if (typeof value !== "string" || !value.trim()) return fallback

  const normalized = normalizePriceInput(value)
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizePriceInput(value: string) {
  const trimmed = value.trim().replace(/\s/g, "")
  const lastComma = trimmed.lastIndexOf(",")
  const lastDot = trimmed.lastIndexOf(".")

  if (lastComma >= 0 && lastDot >= 0) {
    return lastComma > lastDot ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed.replace(/,/g, "")
  }

  if (lastComma >= 0) return trimmed.replace(",", ".")
  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) return trimmed.replace(/\./g, "")
  return trimmed
}

function isSupportedFile(filename: string) {
  return /\.(xlsx|xls|csv)$/i.test(filename)
}

function samePrice(a: number | null, b: number | null) {
  if (a === null || b === null) return false
  return Math.round(a * 100) === Math.round(b * 100)
}

function revalidatePriceImportPaths(batchId: string) {
  revalidatePath("/admin/products")
  revalidatePath("/admin/products/prices")
  revalidatePath("/admin/products/prices/import")
  revalidatePath("/admin/products/prices/import/history")
  revalidatePath(`/admin/products/prices/import/${batchId}`)
  revalidatePath("/products")
}
