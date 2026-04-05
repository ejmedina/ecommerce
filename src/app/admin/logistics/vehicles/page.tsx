"use client"

import { useState, useEffect } from "react"
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from "@/lib/actions/logistics-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  
  // Form state
  const [name, setName] = useState("")
  const [licensePlate, setLicensePlate] = useState("")
  const [capacity, setCapacity] = useState("")
  const [isActive, setIsActive] = useState(true)

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const data = await getVehicles()
      setVehicles(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const openDialog = (vehicle?: any) => {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setName(vehicle.name)
      setLicensePlate(vehicle.licensePlate || "")
      setCapacity(vehicle.capacity?.toString() || "")
      setIsActive(vehicle.isActive)
    } else {
      setEditingVehicle(null)
      setName("")
      setLicensePlate("")
      setCapacity("")
      setIsActive(true)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return

    const data = {
      name,
      licensePlate,
      capacity: capacity ? parseInt(capacity) : undefined,
      isActive
    }

    if (editingVehicle) {
      await updateVehicle(editingVehicle.id, data)
    } else {
      await createVehicle(data)
    }
    
    setDialogOpen(false)
    loadVehicles()
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este vehículo? Si está en uso, solo se desactivará.")) {
      await deleteVehicle(id)
      loadVehicles()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Móviles / Vehículos</h1>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Patente</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay vehículos registrados</TableCell>
              </TableRow>
            ) : (
              vehicles.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.licensePlate || '-'}</TableCell>
                  <TableCell>{v.capacity || '-'}</TableCell>
                  <TableCell>
                    {v.isActive ? (
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
                    <Button variant="ghost" size="icon" onClick={() => openDialog(v)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(v.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre identificador <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Kangoo Blanca" />
            </div>
            <div className="space-y-2">
              <Label>Patente</Label>
              <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="Ej: AB123CD" />
            </div>
            <div className="space-y-2">
              <Label>Capacidad (bultos/pedidos)</Label>
              <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Opcional" />
            </div>
            {editingVehicle && (
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)} 
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="font-normal cursor-pointer">Vehículo activo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
