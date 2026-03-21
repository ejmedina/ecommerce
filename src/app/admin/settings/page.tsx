import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function SettingsPage() {
  const settings = await db.storeSettings.findFirst()

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay configuración disponible.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Información de la tienda</CardTitle>
          <CardDescription>Detalles generales de tu tienda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Nombre de la tienda</p>
            <p className="text-muted-foreground">{settings.storeName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-muted-foreground">{settings.storeEmail || "No configurado"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Teléfono</p>
            <p className="text-muted-foreground">{settings.storePhone || "No configurado"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Envío gratis desde</p>
            <p className="text-muted-foreground">${Number(settings.freeShippingMin).toLocaleString("es-AR")}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Costo de envío</p>
            <p className="text-muted-foreground">${Number(settings.fixedShippingCost).toLocaleString("es-AR")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
