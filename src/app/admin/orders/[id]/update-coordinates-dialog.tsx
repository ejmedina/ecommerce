"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { MapPin, Loader2 } from "lucide-react"
import { updateOrderCoordinates } from "@/lib/actions/order-actions"
import { useRouter } from "next/navigation"

interface UpdateCoordinatesDialogProps {
  orderId: string
  currentLat?: number
  currentLng?: number
}

export function UpdateCoordinatesDialog({ orderId, currentLat, currentLng }: UpdateCoordinatesDialogProps) {
  const [open, setOpen] = useState(false)
  const [lat, setLat] = useState(currentLat?.toString() || "")
  const [lng, setLng] = useState(currentLng?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    if (!lat || !lng) return
    setIsLoading(true)
    
    try {
      const result = await updateOrderCoordinates(orderId, parseFloat(lat), parseFloat(lng))
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        alert(result.message || "Error al actualizar coordenadas")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
          <MapPin className="h-3 w-3" />
          Editar Coordenadas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajustar Coordenadas</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Si la ubicación automática es incorrecta, puedes buscar las coordenadas en Google Maps (botón derecho → copiar coordenadas) y pegarlas aquí.
          </p>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lat" className="text-right">Latitud</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="col-span-3"
              placeholder="-34.6037"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lng" className="text-right">Longitud</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="col-span-3"
              placeholder="-58.3816"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !lat || !lng}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
