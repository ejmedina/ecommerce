"use client"

import { useState, useEffect } from "react"
import { getDepots, createDepot, updateDepot, deleteDepot } from "@/lib/actions/logistics-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Check, X, MapPin } from "lucide-react"

export default function DepotsPage() {
  const [depots, setDepots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDepot, setEditingDepot] = useState<any>(null)
  
  // Form state
  const [name, setName] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [isActive, setIsActive] = useState(true)

  const loadDepots = async () => {
    setLoading(true)
    try {
      const data = await getDepots()
      setDepots(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDepots()
  }, [])

  const openDialog = (depot?: any) => {
    if (depot) {
      setEditingDepot(depot)
      setName(depot.name)
      setStreet(depot.address?.street || "")
      setNumber(depot.address?.number || "")
      setCity(depot.address?.city || "")
      setState(depot.address?.state || "")
      setPostalCode(depot.address?.postalCode || "")
      setLat(depot.lat?.toString() || "")
      setLng(depot.lng?.toString() || "")
      setIsActive(depot.isActive)
    } else {
      setEditingDepot(null)
      setName("")
      setStreet("")
      setNumber("")
      setCity("")
      setState("")
      setPostalCode("")
      setLat("")
      setLng("")
      setIsActive(true)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim() || !street.trim() || !number.trim() || !city.trim()) return

    const addressData = {
      street,
      number,
      city,
      state,
      postalCode,
      country: "AR"
    }

    const data = {
      name,
      address: addressData,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      isActive
    }

    if (editingDepot) {
      await updateDepot(editingDepot.id, data)
    } else {
      await createDepot(data)
    }
    
    setDialogOpen(false)
    loadDepots()
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este depósito? Si está en uso en rutas, solo se desactivará.")) {
      await deleteDepot(id)
      loadDepots()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Depósitos y Bases</h1>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Depósito
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Coordenadas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : depots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay depósitos registrados</TableCell>
              </TableRow>
            ) : (
              depots.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    {d.address?.street} {d.address?.number}, {d.address?.city}
                  </TableCell>
                  <TableCell>
                    {d.lat && d.lng ? (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" /> {d.lat}, {d.lng}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500">Sin geocodificar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.isActive ? (
                      <span className="inline-flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                        <Check className="w-3 h-3 mr-1" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
                        <X className="w-3 h-3 mr-1" /> Inactivo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(d)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDepot ? 'Editar Depósito' : 'Nuevo Depósito'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label>Nombre identificador <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Depósito Central" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label>Calle <span className="text-red-500">*</span></Label>
                <Input value={street} onChange={e => setStreet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Número <span className="text-red-500">*</span></Label>
                <Input value={number} onChange={e => setNumber(e.target.value)} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Ciudad <span className="text-red-500">*</span></Label>
                <Input value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Input value={state} onChange={e => setState(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Código Postal</Label>
              <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Coordenadas (Opcional, se pueden rellenar automáticamente luego en el ruteo)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Latitud</Label>
                  <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="-34.6037" />
                </div>
                <div className="space-y-2">
                  <Label>Longitud</Label>
                  <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="-58.3816" />
                </div>
              </div>
            </div>

            {editingDepot && (
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isActiveDepot" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)} 
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActiveDepot" className="font-normal cursor-pointer">Depósito activo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !street.trim() || !number.trim() || !city.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
