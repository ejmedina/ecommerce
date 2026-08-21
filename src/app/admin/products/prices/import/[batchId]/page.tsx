import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react"
import { db } from "@/lib/db"
import { applyPriceImportBatch, revertPriceImportBatch } from "../actions"
import { canApplyPreviewRow, priceImportStatusLabel } from "@/lib/price-import/matching"
import type { PriceImportPreviewData } from "@/lib/price-import/types"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PriceImportReviewClient } from "./price-import-review-client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Props = {
  params: Promise<{ batchId: string }>
  searchParams: Promise<{ applied?: string; unit?: string; combo?: string; reverted?: string; conflicts?: string }>
}

type StoredPreviewData = PriceImportPreviewData & { parseErrors?: string[] }

export default async function PriceImportBatchPage({ params, searchParams }: Props) {
  const { batchId } = await params
  const query = await searchParams
  const batch = await db.priceImportBatch.findUnique({
    where: { id: batchId },
    include: {
      uploadedBy: { select: { email: true, name: true } },
      revertedBy: { select: { email: true, name: true } },
      changes: {
        include: {
          product: { select: { id: true, name: true } },
        },
        orderBy: { changedAt: "asc" },
      },
    },
  })

  if (!batch) notFound()

  const previewData = batch.previewData as unknown as StoredPreviewData | null
  const rows = previewData?.rows || []
  const applicableRows = rows.filter(canApplyPreviewRow)
  const skippedRows = rows.length - applicableRows.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <Link href="/admin/products/prices/import" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a cargar precios
          </Link>
          <h1 className="text-2xl font-bold">Revisión de importación</h1>
          <p className="text-sm text-muted-foreground">
            {batch.filename} · Subido {formatDateTime(batch.uploadedAt)} por {batch.uploadedBy?.name || batch.uploadedBy?.email || "Usuario"}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      {query.applied ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Precios aplicados</AlertTitle>
          <AlertDescription>
            Se actualizaron {query.unit || 0} productos unitarios y {query.combo || 0} combos.
          </AlertDescription>
        </Alert>
      ) : null}

      {query.reverted ? (
        <Alert>
          <RotateCcw className="h-4 w-4" />
          <AlertTitle>Rollback procesado</AlertTitle>
          <AlertDescription>
            Productos revertidos: {query.reverted}. Conflictos omitidos: {query.conflicts || 0}.
          </AlertDescription>
        </Alert>
      ) : null}

      {batch.status === "FAILED" ? (
        <Card>
          <CardHeader>
            <CardTitle>El archivo no pudo analizarse</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {(previewData?.parseErrors || ["Error al analizar el archivo."]).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {batch.status === "ANALYZED" && previewData ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumen antes de aplicar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <SummaryItem label="Filas" value={rows.length} />
              <SummaryItem label="Aplicables" value={applicableRows.length} />
              <SummaryItem label="Con advertencias" value={batch.warningRows} />
              <SummaryItem label="No aplicadas" value={skippedRows} />
            </CardContent>
          </Card>

          {previewData.missingProviderProducts.length > 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Productos con Código proveedor ausentes</AlertTitle>
              <AlertDescription>
                <p>
                  Estos productos tienen Código proveedor, pero no aparecen en la planilla cargada. Sus precios no serán modificados.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewData.missingProviderProducts.slice(0, 20).map((product) => (
                    <Badge key={product.id} variant="outline">
                      {product.name} ({product.externalProviderCode})
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <PriceImportReviewClient batchId={batch.id} previewData={previewData} />

          <Card>
            <CardHeader>
              <CardTitle>Aplicar precios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p>Se actualizarán solo filas completas y confirmadas. No se crearán productos nuevos ni se despublicarán productos existentes.</p>
                <p>Filas con advertencias, inválidas, ignoradas, incompletas o con matches heurísticos sin confirmar no serán aplicadas.</p>
              </div>
              <form action={applyPriceImportBatch}>
                <input type="hidden" name="batchId" value={batch.id} />
                <Button type="submit" disabled={applicableRows.length === 0}>
                  Aplicar precios
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}

      {batch.status !== "ANALYZED" && batch.status !== "FAILED" ? (
        <AppliedBatchDetail batchId={batch.id} status={batch.status} changes={batch.changes} />
      ) : null}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function AppliedBatchDetail({
  batchId,
  status,
  changes,
}: {
  batchId: string
  status: string
  changes: Array<{
    id: string
    oldPrice: unknown
    newPrice: unknown
    priceRole: string | null
    externalProviderCode: string | null
    product: { id: string; name: string }
  }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos modificados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Código proveedor</TableHead>
              <TableHead>Precio anterior</TableHead>
              <TableHead>Precio aplicado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hubo cambios de precio registrados.
                </TableCell>
              </TableRow>
            ) : (
              changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell>{change.product.name}</TableCell>
                  <TableCell>{change.priceRole === "COMBO" ? "Combo x2" : "Unitario"}</TableCell>
                  <TableCell className="font-mono text-xs">{change.externalProviderCode || "N/A"}</TableCell>
                  <TableCell>{formatCurrency(Number(change.oldPrice))}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(Number(change.newPrice))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {status === "APPLIED" ? (
          <form action={revertPriceImportBatch}>
            <input type="hidden" name="batchId" value={batchId} />
            <Button type="submit" variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Revertir importación
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPLIED" || status === "AUTO_MATCH") return <Badge variant="success">{status === "APPLIED" ? "Aplicada" : "Match automático"}</Badge>
  if (status === "FAILED" || status === "INVALID_PRICE") return <Badge variant="destructive">{status === "FAILED" ? "Fallida" : "Precio inválido"}</Badge>
  if (status === "REVERTED") return <Badge variant="secondary">Revertida</Badge>
  if (status === "PARTIALLY_REVERTED") return <Badge variant="warning">Parcialmente revertida</Badge>
  if (status === "ANALYZED") return <Badge variant="outline">Analizada</Badge>
  return <Badge variant="warning">{isRowStatus(status) ? priceImportStatusLabel(status) : status}</Badge>
}

function isRowStatus(status: string): status is Parameters<typeof priceImportStatusLabel>[0] {
  return [
    "AUTO_MATCH",
    "NEEDS_REVIEW",
    "NEW_UNMATCHED",
    "UNIT_NOT_FOUND",
    "COMBO_NOT_FOUND",
    "INVALID_PRICE",
    "NO_CHANGES",
    "IGNORED",
  ].includes(status)
}
