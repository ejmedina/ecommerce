"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Search, Save } from "lucide-react"
import { updateImportPreviewRow } from "../actions"
import { canApplyPreviewRow, isComboCandidate, priceImportStatusLabel } from "@/lib/price-import/matching"
import type {
  PriceImportMatch,
  PriceImportPreviewData,
  PriceImportPreviewRow,
  PriceImportProductOption,
  PriceImportRowStatus,
} from "@/lib/price-import/types"
import { formatCurrency } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  batchId: string
  previewData: PriceImportPreviewData
}

type RowDraft = {
  unitProductId: string
  comboProductId: string
  unitPriceInput: string
  comboDiscountInput: string
}

export function PriceImportReviewClient({ batchId, previewData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState(previewData.rows)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})

  const products = previewData.productOptions
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const unitProducts = useMemo(() => products.filter((product) => !isProductCombo(product)), [products])
  const comboProducts = useMemo(() => products.filter(isProductCombo), [products])
  const currentRow = rows[currentIndex] || rows[0]
  const applicableRows = rows.filter(canApplyPreviewRow)
  const pendingRows = rows.filter((row) => !canApplyPreviewRow(row) && !row.ignored)
  const ignoredRows = rows.filter((row) => row.ignored)
  const draft = currentRow ? drafts[currentRow.rowId] ?? buildDraft(currentRow, productsById) : null
  const unitProductId = draft?.unitProductId || ""
  const comboProductId = draft?.comboProductId || ""
  const unitPriceInput = draft?.unitPriceInput || ""
  const comboDiscountInput = draft?.comboDiscountInput || ""

  const selectedUnitProduct = unitProductId ? productsById.get(unitProductId) || null : null
  const selectedComboProduct = comboProductId ? productsById.get(comboProductId) || null : null
  const comboRelationship = selectedUnitProduct?.relatedCombos?.find((combo) => combo.id === comboProductId) || null
  const comboUnits = comboRelationship?.quantity || 2
  const unitTargetPrice = parseInputPrice(unitPriceInput)
  const comboDiscount = parseInputPrice(comboDiscountInput)
  const regularComboPrice = unitTargetPrice === null ? null : unitTargetPrice * comboUnits
  const comboTargetPrice =
    regularComboPrice === null || comboDiscount === null ? currentRow?.comboMatch.newPrice ?? currentRow?.comboPrice ?? null : regularComboPrice - comboDiscount
  const comboDiscountPercent =
    regularComboPrice && comboDiscount !== null ? Math.max(0, (comboDiscount / regularComboPrice) * 100) : null

  if (!currentRow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview de filas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No hay filas para revisar.</CardContent>
      </Card>
    )
  }

  function goTo(index: number) {
    setCurrentIndex(Math.min(Math.max(index, 0), rows.length - 1))
    setError(null)
  }

  function updateDraft(patch: Partial<RowDraft>) {
    setDrafts((previousDrafts) => ({
      ...previousDrafts,
      [currentRow.rowId]: {
        ...(previousDrafts[currentRow.rowId] ?? buildDraft(currentRow, productsById)),
        ...patch,
      },
    }))
  }

  function selectRelatedCombo(comboId: string, quantity: number) {
    const unitPrice = parseInputPrice(unitPriceInput) ?? currentRow.unitPrice
    const comboPrice = currentRow.comboMatch.newPrice ?? currentRow.comboPrice

    if (unitPrice !== null && comboPrice !== null) {
      updateDraft({
        comboProductId: comboId,
        comboDiscountInput: toPriceInput(unitPrice * quantity - comboPrice),
      })
      return
    }

    updateDraft({ comboProductId: comboId })
  }

  function saveCurrentRow(intent: "confirm" | "ignore", moveNext = false) {
    setError(null)

    const formData = new FormData()
    formData.set("batchId", batchId)
    formData.set("rowId", currentRow.rowId)
    formData.set("intent", intent)

    if (intent === "confirm") {
      formData.set("unitProductId", unitProductId)
      formData.set("comboProductId", comboProductId)
      if (unitTargetPrice !== null) formData.set("unitNewPrice", String(unitTargetPrice))
      if (comboTargetPrice !== null) formData.set("comboNewPrice", String(comboTargetPrice))
    }

    startTransition(async () => {
      try {
        await updateImportPreviewRow(formData)
        setRows((previousRows) =>
          previousRows.map((row) =>
            row.rowId === currentRow.rowId
              ? buildLocalRow({
                  row,
                  intent,
                  unitProduct: unitProductId ? productsById.get(unitProductId) || null : null,
                  comboProduct: comboProductId ? productsById.get(comboProductId) || null : null,
                  unitNewPrice: unitTargetPrice ?? row.unitPrice,
                  comboNewPrice: comboTargetPrice ?? row.comboPrice,
                })
              : row
          )
        )
        if (moveNext) goTo(currentIndex + 1)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el borrador.")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Preview de filas</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0 || isPending}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Badge variant="outline">
              {currentIndex + 1} / {rows.length}
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= rows.length - 1 || isPending}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <ReviewStat label="Aplicables" value={applicableRows.length} />
          <ReviewStat label="Pendientes" value={pendingRows.length} />
          <ReviewStat label="Ignoradas" value={ignoredRows.length} />
          <ReviewStat label="Progreso" value={`${Math.round(((currentIndex + 1) / rows.length) * 100)}%`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudo guardar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="rounded-md border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={currentRow.status} />
                {canApplyPreviewRow(currentRow) ? <Badge variant="success">Listo para aplicar</Badge> : null}
                {currentRow.ignored ? <Badge variant="secondary">Ignorada</Badge> : null}
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Código proveedor</p>
                <p className="font-mono text-sm">{currentRow.providerCode || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Descripción proveedor</p>
                <p className="text-base font-semibold">{currentRow.providerDescription || "Sin descripción"}</p>
              </div>
            </div>
            <div className="grid min-w-56 gap-2 text-sm">
              <PriceLine label="Excel unitario" value={currentRow.unitPrice} />
              <PriceLine label="Excel combo x2" value={currentRow.comboPrice} />
            </div>
          </div>

          {[...currentRow.errors, ...currentRow.warnings].length > 0 ? (
            <div className="mt-4 space-y-1 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {[...currentRow.errors, ...currentRow.warnings].map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-4 rounded-md border p-4">
            <div>
              <h3 className="text-base font-semibold">Producto unitario</h3>
              <p className="text-sm text-muted-foreground">Buscá y confirmá el producto que corresponde a la fila.</p>
            </div>
              <ProductSearchSelect
              key={`unit-${currentRow.rowId}-${unitProductId || "none"}`}
              label="Producto"
              placeholder="Buscar producto unitario"
              products={unitProducts}
              selectedId={unitProductId}
              onSelect={(id) => updateDraft({ unitProductId: id })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unit-new-price">Precio a aplicar</Label>
                <Input
                  id="unit-new-price"
                  inputMode="decimal"
                  value={unitPriceInput}
                  onChange={(event) => updateDraft({ unitPriceInput: event.target.value })}
                />
              </div>
              <PriceComparison current={selectedUnitProduct?.price ?? currentRow.unitMatch.currentPrice} target={unitTargetPrice} />
            </div>
          </section>

          <section className="space-y-4 rounded-md border p-4">
            <div>
              <h3 className="text-base font-semibold">Combo relacionado</h3>
              <p className="text-sm text-muted-foreground">Elegí el combo x2 y revisá el descuento sugerido desde la planilla.</p>
            </div>

            {selectedUnitProduct?.relatedCombos?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Combos que incluyen el producto</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUnitProduct.relatedCombos.map((combo) => (
                    <Button
                      key={combo.id}
                      type="button"
                      variant={combo.id === comboProductId ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectRelatedCombo(combo.id, combo.quantity)}
                    >
                      {combo.name} · {combo.quantity} u.
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                Elegí un producto unitario para ver si participa en combos existentes.
              </p>
            )}

            <ProductSearchSelect
              key={`combo-${currentRow.rowId}-${comboProductId || "none"}`}
              label="Combo x2"
              placeholder="Buscar combo"
              products={comboProducts}
              selectedId={comboProductId}
              onSelect={(id) => updateDraft({ comboProductId: id })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="combo-discount">Descuento combo</Label>
                <Input
                  id="combo-discount"
                  inputMode="decimal"
                  value={comboDiscountInput}
                  onChange={(event) => updateDraft({ comboDiscountInput: event.target.value })}
                />
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <PriceLine label={`${comboUnits} unidades sin descuento`} value={regularComboPrice} />
                <PriceLine label="Precio combo a aplicar" value={comboTargetPrice} strong />
                <p className="mt-1 text-xs text-muted-foreground">
                  {comboDiscountPercent === null ? "Sin porcentaje calculado" : `${comboDiscountPercent.toFixed(1)}% de descuento sugerido`}
                </p>
              </div>
            </div>

            <PriceComparison current={selectedComboProduct?.price ?? currentRow.comboMatch.currentPrice} target={comboTargetPrice} />
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => saveCurrentRow("ignore")} disabled={isPending}>
            Ignorar fila
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => saveCurrentRow("confirm")} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              Guardar borrador
            </Button>
            <Button type="button" onClick={() => saveCurrentRow("confirm", true)} disabled={isPending || currentIndex >= rows.length - 1}>
              Guardar y siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductSearchSelect({
  label,
  placeholder,
  products,
  selectedId,
  onSelect,
}: {
  label: string
  placeholder: string
  products: PriceImportProductOption[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const selectedProduct = selectedId ? products.find((product) => product.id === selectedId) || null : null
  const [query, setQuery] = useState(selectedProduct?.name || "")
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    const candidates = normalizedQuery
      ? products.filter((product) => normalizeSearch(`${product.name} ${product.sku || ""} ${product.externalProviderCode || ""}`).includes(normalizedQuery))
      : products

    return candidates.slice(0, 10)
  }, [products, query])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        {selectedProduct ? (
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 border-b bg-muted/40 px-3 py-2 text-left text-sm"
            onClick={() => {
              setQuery("")
              onSelect("")
            }}
          >
            <span>
              <span className="block font-medium">{selectedProduct.name}</span>
              <span className="block text-xs text-muted-foreground">{productMeta(selectedProduct)}</span>
            </span>
            <span className="text-xs text-muted-foreground">Quitar</span>
          </button>
        ) : null}
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className="flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
              onClick={() => {
                setQuery(product.name)
                onSelect(product.id)
              }}
            >
              <span>
                <span className="block font-medium">{product.name}</span>
                <span className="block text-xs text-muted-foreground">{productMeta(product)}</span>
              </span>
              <span className="shrink-0 font-medium">{formatCurrency(product.price)}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-4 text-sm text-muted-foreground">No hay resultados para esa búsqueda.</p>
        )}
      </div>
    </div>
  )
}

function ReviewStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}

function PriceComparison({ current, target }: { current: number | null | undefined; target: number | null }) {
  const delta = current !== null && current !== undefined && target !== null ? target - current : null

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <PriceLine label="Actual" value={current ?? null} />
      <PriceLine label="A aplicar" value={target} strong />
      <p className="mt-1 text-xs text-muted-foreground">
        {delta === null ? "Sin diferencia calculada" : `${delta >= 0 ? "+" : ""}${formatCurrency(delta)} vs. actual`}
      </p>
    </div>
  )
}

function PriceLine({ label, value, strong = false }: { label: string; value: number | null; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value === null ? "N/A" : formatCurrency(value)}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: PriceImportRowStatus }) {
  if (status === "AUTO_MATCH") return <Badge variant="success">Match automático</Badge>
  if (status === "INVALID_PRICE") return <Badge variant="destructive">Precio inválido</Badge>
  if (status === "IGNORED") return <Badge variant="secondary">Fila ignorada</Badge>
  return <Badge variant="warning">{priceImportStatusLabel(status)}</Badge>
}

function buildLocalRow({
  row,
  intent,
  unitProduct,
  comboProduct,
  unitNewPrice,
  comboNewPrice,
}: {
  row: PriceImportPreviewRow
  intent: "confirm" | "ignore"
  unitProduct: PriceImportProductOption | null
  comboProduct: PriceImportProductOption | null
  unitNewPrice: number | null
  comboNewPrice: number | null
}): PriceImportPreviewRow {
  if (intent === "ignore") {
    return {
      ...row,
      ignored: true,
      status: "IGNORED",
      unitMatch: { ...row.unitMatch, confirmed: false },
      comboMatch: { ...row.comboMatch, confirmed: false },
    }
  }

  const nextRow: PriceImportPreviewRow = {
    ...row,
    ignored: false,
    unitMatch: buildManualMatch(unitProduct, unitNewPrice),
    comboMatch: buildManualMatch(comboProduct, comboNewPrice),
  }

  return {
    ...nextRow,
    status: getManualStatus(nextRow),
  }
}

function buildDraft(row: PriceImportPreviewRow, productsById: Map<string, PriceImportProductOption>): RowDraft {
  return {
    unitProductId: row.unitMatch.productId || "",
    comboProductId: row.comboMatch.productId || "",
    unitPriceInput: toPriceInput(row.unitMatch.newPrice ?? row.unitPrice),
    comboDiscountInput: toPriceInput(getInitialComboDiscount(row, productsById)),
  }
}

function buildManualMatch(product: PriceImportProductOption | null, newPrice: number | null): PriceImportMatch {
  if (!product) {
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

function getManualStatus(row: PriceImportPreviewRow): PriceImportRowStatus {
  if (row.errors.length > 0) return "INVALID_PRICE"
  if (!row.unitMatch.productId) return "UNIT_NOT_FOUND"
  if (!row.comboMatch.productId) return "COMBO_NOT_FOUND"
  if (samePrice(row.unitMatch.currentPrice, row.unitMatch.newPrice) && samePrice(row.comboMatch.currentPrice, row.comboMatch.newPrice)) {
    return "NO_CHANGES"
  }
  return "NEEDS_REVIEW"
}

function getInitialComboDiscount(row: PriceImportPreviewRow, productsById: Map<string, PriceImportProductOption>) {
  const unitPrice = row.unitMatch.newPrice ?? row.unitPrice
  const comboPrice = row.comboMatch.newPrice ?? row.comboPrice

  if (unitPrice === null || comboPrice === null) return null

  const unitProduct = row.unitMatch.productId ? productsById.get(row.unitMatch.productId) || null : null
  const comboQuantity =
    unitProduct?.relatedCombos?.find((combo) => combo.id === row.comboMatch.productId)?.quantity || 2

  return unitPrice * comboQuantity - comboPrice
}

function parseInputPrice(value: string) {
  if (!value.trim()) return null
  const parsed = Number(normalizePriceInput(value))
  return Number.isFinite(parsed) ? parsed : null
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

function toPriceInput(value: number | null) {
  return value === null ? "" : String(value)
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function productMeta(product: PriceImportProductOption) {
  return [
    product.sku ? `SKU ${product.sku}` : null,
    product.externalProviderCode ? `Proveedor ${product.externalProviderCode}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "Sin SKU ni código proveedor"
}

function isProductCombo(product: PriceImportProductOption) {
  return product.isCombo || isComboCandidate(product.name)
}

function samePrice(a: number | null, b: number | null) {
  if (a === null || b === null) return false
  return Math.round(a * 100) === Math.round(b * 100)
}
