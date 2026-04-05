"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { ARGENTINE_PROVINCES } from "@/lib/shipping"

interface Address {
  id?: string
  label: string
  street: string
  number: string
  floor?: string
  apartment?: string
  city: string
  state: string
  postalCode: string
  instructions?: string
  isDefault?: boolean
}

interface AddressFormProps {
  address?: Address | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddressForm({ address, onSuccess, onCancel }: AddressFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState<Address>({
    label: address?.label || "",
    street: address?.street || "",
    number: address?.number || "",
    floor: address?.floor || "",
    apartment: address?.apartment || "",
    city: address?.city || "",
    state: address?.state || "",
    postalCode: address?.postalCode || "",
    instructions: address?.instructions || "",
    isDefault: address?.isDefault || false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const url = address?.id 
        ? `/api/auth/addresses/${address.id}`
        : "/api/auth/addresses"
      
      const method = address?.id ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Error al guardar la dirección")
        return
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError("Error al guardar la dirección")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="label">Nombre de la dirección *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
          placeholder="Ej: Mi casa, Oficina, Casa de mis papás"
          required
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-9 space-y-2">
          <Label htmlFor="street">Calle *</Label>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
            placeholder="Nombre de la calle"
            required
          />
        </div>
        <div className="col-span-3 space-y-2">
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={formData.number}
            onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
            placeholder="1234"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="floor">Piso</Label>
          <Input
            id="floor"
            value={formData.floor}
            onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
            placeholder="3"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apartment">Depto</Label>
          <Input
            id="apartment"
            value={formData.apartment}
            onChange={(e) => setFormData(prev => ({ ...prev, apartment: e.target.value }))}
            placeholder="A"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="Buenos Aires"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Provincia *</Label>
          <select
            id="state"
            value={formData.state}
            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
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

      <div className="space-y-2">
        <Label htmlFor="postalCode">Código Postal *</Label>
        <Input
          id="postalCode"
          value={formData.postalCode}
          onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
          placeholder="1428"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instrucciones de entrega</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
          placeholder="Ej: timbre en el 3er piso, dejar en conserjería..."
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked === true }))}
        />
        <Label htmlFor="isDefault" className="cursor-pointer">
          Establecer como dirección principal
        </Label>
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} className="flex-1">
          {address?.id ? "Actualizar" : "Guardar"} dirección
        </Button>
      </div>
    </form>
  )
}
