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
  addressLabel?: string
  onUpdate?: () => void
}

export function UpdateCoordinatesDialog({ orderId, currentLat, currentLng, addressLabel, onUpdate }: UpdateCoordinatesDialogProps) {
  const [open, setOpen] = useState(false)
  const [lat, setLat] = useState(currentLat?.toString() || "")
  const [lng, setLng] = useState(currentLng?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text')
    // Regex to match "lat, lng" or simply "lat lng"
    const coordsMatch = pasteData.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || pasteData.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)/)
    
    if (coordsMatch) {
      e.preventDefault()
      setLat(coordsMatch[1])
      setLng(coordsMatch[2])
    }
  }

  const handleSave = async () => {
    if (!lat || !lng) return
    setIsLoading(true)
    
    try {
      const result = await updateOrderCoordinates(orderId, parseFloat(lat), parseFloat(lng))
      if (result.success) {
        setOpen(false)
        if (onUpdate) {
          onUpdate()
        } else {
          router.refresh()
        }
      } else {
        alert(result.message || "Error al actualizar coordenadas")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const mapLink = addressLabel 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addressLabel}, Argentina`)}`
    : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 w-full font-medium">
          <MapPin className="h-4 w-4" />
          Editar Coordenadas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajustar Coordenadas</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">
              Si la ubicación es incorrecta, busca las coordenadas en Google Maps (clic derecho → "Qué hay aquí?" → copiar decimales) y pégalas abajo.
            </p>
            {mapLink && (
              <a 
                href={mapLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
              >
                <MapPin className="h-4 w-4" />
                Buscar "{addressLabel}" en Google Maps
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lat" className="text-right">Latitud</Label>
            <Input
              id="lat"
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              onPaste={handlePaste}
              className="col-span-3"
              placeholder="-34.6037"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lng" className="text-right">Longitud</Label>
            <Input
              id="lng"
              type="text"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              onPaste={handlePaste}
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
            Guardar Coordenadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
