import Link from "next/link"
import { ArrowLeft, Eye, RotateCcw, Upload } from "lucide-react"
import { db } from "@/lib/db"
import { revertPriceImportBatch } from "../actions"
import { formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function PriceImportHistoryPage() {
  const batches = await db.priceImportBatch.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 50,
    include: {
      uploadedBy: { select: { email: true, name: true } },
      _count: { select: { changes: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link href="/admin/products/prices/import" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a cargar precios
          </Link>
          <h1 className="text-2xl font-bold">Historial de importaciones</h1>
          <p className="text-sm text-muted-foreground">
            Lotes analizados, aplicados y revertidos.
          </p>
        </div>
        <Link href="/admin/products/prices/import">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Nueva carga
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importaciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Subida</TableHead>
                <TableHead>Aplicada</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cambios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Todavía no hay importaciones registradas.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.filename}</TableCell>
                    <TableCell>{formatDateTime(batch.uploadedAt)}</TableCell>
                    <TableCell>{batch.appliedAt ? formatDateTime(batch.appliedAt) : "N/A"}</TableCell>
                    <TableCell>{batch.uploadedBy?.name || batch.uploadedBy?.email || "Usuario"}</TableCell>
                    <TableCell><BatchStatusBadge status={batch.status} /></TableCell>
                    <TableCell>{batch._count.changes}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/prices/import/${batch.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1.5 h-4 w-4" />
                            Ver detalle
                          </Button>
                        </Link>
                        {batch.status === "APPLIED" ? (
                          <form action={revertPriceImportBatch}>
                            <input type="hidden" name="batchId" value={batch.id} />
                            <Button type="submit" variant="outline" size="sm">
                              <RotateCcw className="mr-1.5 h-4 w-4" />
                              Revertir
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function BatchStatusBadge({ status }: { status: string }) {
  if (status === "APPLIED") return <Badge variant="success">Aplicada</Badge>
  if (status === "FAILED") return <Badge variant="destructive">Fallida</Badge>
  if (status === "REVERTED") return <Badge variant="secondary">Revertida</Badge>
  if (status === "PARTIALLY_REVERTED") return <Badge variant="warning">Parcialmente revertida</Badge>
  return <Badge variant="outline">Analizada</Badge>
}
