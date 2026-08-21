import Link from "next/link"
import { ArrowLeft, History, Upload } from "lucide-react"
import { analyzePriceImport } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function PriceImportUploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link href="/admin/products/prices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a precios
          </Link>
          <h1 className="text-2xl font-bold">Cargar precios</h1>
          <p className="text-sm text-muted-foreground">
            Subí una lista Excel o CSV para analizar coincidencias antes de modificar precios.
          </p>
        </div>
        <Link href="/admin/products/prices/import/history">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Historial
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Archivo de proveedor</CardTitle>
          <CardDescription>
            Se lee la primera hoja y se buscan las columnas Codigo, Descripcion, Lista o Precio Unitario, y Redondeo Combo x 2 o Combo x 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={analyzePriceImport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Excel o CSV</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                required
              />
            </div>
            <Button type="submit">
              <Upload className="mr-2 h-4 w-4" />
              Subir y analizar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
