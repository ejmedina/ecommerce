"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { AddressForm } from "./address-form"

interface Address {
  id: string
  label: string
  street: string
  number: string
  floor?: string
  apartment?: string
  city: string
  state: string
  postalCode: string
  instructions?: string
  isDefault: boolean
}

interface AddressListProps {
  addresses: Address[]
}

export function AddressList({ addresses: initialAddresses }: AddressListProps) {
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  function handleSuccess() {
    // Refresh addresses
    fetch("/api/auth/addresses")
      .then(res => res.json())
      .then(data => {
        setAddresses(data)
        setShowForm(false)
        setEditingAddress(null)
        router.refresh()
      })
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta dirección?")) return

    try {
      const res = await fetch(`/api/auth/addresses/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setAddresses(addresses.filter(a => a.id !== id))
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting address:", error)
    }
  }

  if (showForm || editingAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editingAddress ? "Editar dirección" : "Nueva dirección"}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm 
            address={editingAddress} 
            onSuccess={handleSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingAddress(null)
            }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar dirección
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tenés direcciones guardadas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{address.label}</CardTitle>
                  {address.isDefault && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Principal
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{address.street} {address.number}</p>
                {address.floor && <p className="text-sm">Piso: {address.floor}</p>}
                {address.apartment && <p className="text-sm">Depto: {address.apartment}</p>}
                <p className="text-sm">{address.city}, {address.state} {address.postalCode}</p>
                {address.instructions && (
                  <p className="text-sm text-muted-foreground mt-2">{address.instructions}</p>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingAddress(address)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
