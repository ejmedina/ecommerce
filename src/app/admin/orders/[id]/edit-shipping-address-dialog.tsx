"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, Pencil } from "lucide-react"
import { ARGENTINE_PROVINCES } from "@/lib/shipping"
import { updateOrderShippingAddress } from "@/lib/actions/order-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ShippingAddressData {
  street?: string
  number?: string
  floor?: string | null
  apartment?: string | null
  city?: string
  state?: string
  postalCode?: string
  country?: string
  instructions?: string | null
}

interface EditShippingAddressDialogProps {
  orderId: string
  address: ShippingAddressData | null
}

export function EditShippingAddressDialog({ orderId, address }: EditShippingAddressDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    street: address?.street || "",
    number: address?.number || "",
    floor: address?.floor || "",
    apartment: address?.apartment || "",
    city: address?.city || "",
    state: address?.state || "",
    postalCode: address?.postalCode || "",
    country: address?.country || "AR",
    instructions: address?.instructions || "",
  })

  const handleSave = async () => {
    setIsLoading(true)
    setError("")

    const result = await updateOrderShippingAddress(orderId, formData)

    setIsLoading(false)

    if (result.success) {
      setOpen(false)
      router.refresh()
      return
    }

    setError(result.message || "No se pudo actualizar el domicilio de entrega")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Pencil className="mr-2 h-4 w-4" />
          Editar domicilio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar domicilio de entrega</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 space-y-2">
              <Label htmlFor="street">Calle</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(event) => setFormData((current) => ({ ...current, street: event.target.value }))}
              />
            </div>
            <div className="col-span-4 space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(event) => setFormData((current) => ({ ...current, number: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="floor">Piso</Label>
              <Input
                id="floor"
                value={formData.floor}
                onChange={(event) => setFormData((current) => ({ ...current, floor: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apartment">Depto</Label>
              <Input
                id="apartment"
                value={formData.apartment}
                onChange={(event) => setFormData((current) => ({ ...current, apartment: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Provincia</Label>
              <select
                id="state"
                value={formData.state}
                onChange={(event) => setFormData((current) => ({ ...current, state: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Seleccioná una provincia</option>
                {ARGENTINE_PROVINCES.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código postal</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(event) => setFormData((current) => ({ ...current, postalCode: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(event) => setFormData((current) => ({ ...current, country: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instrucciones</Label>
            <Textarea
              id="instructions"
              rows={3}
              value={formData.instructions}
              onChange={(event) => setFormData((current) => ({ ...current, instructions: event.target.value }))}
            />
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Al guardar el nuevo domicilio se limpian las coordenadas para que el admin pueda revisarlas nuevamente si hace falta.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar domicilio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
