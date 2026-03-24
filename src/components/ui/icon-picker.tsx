"use client"

import { useState, useMemo } from "react"
import * as LucideIcons from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

// Get all icon names from lucide-react
const ICON_NAMES = Object.keys(LucideIcons).filter(
  (name) => typeof LucideIcons[name as keyof typeof LucideIcons] === "object" && 
            (LucideIcons[name as keyof typeof LucideIcons] as any)?.displayName
)

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  label?: string
}

export function IconPicker({ value, onChange, label = "Ícono" }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredIcons = useMemo(() => {
    if (!search) return ICON_NAMES.slice(0, 100) // Limit initial load
    return ICON_NAMES.filter(name => 
      name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 100)
  }, [search])

  const handleSelect = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
    setSearch("")
  }

  const CurrentIcon = value && LucideIcons[value as keyof typeof LucideIcons] 
    ? LucideIcons[value as keyof typeof LucideIcons] 
    : null

  return (
    <>
      <div className="space-y-2">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start gap-2"
        >
          {CurrentIcon ? (
            <CurrentIcon className="h-5 w-5" />
          ) : (
            <span className="text-muted-foreground">Seleccionar ícono</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {value || "Ninguno"}
          </span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar Ícono</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <Input
              placeholder="Buscar ícono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => {
                const Icon = LucideIcons[iconName as keyof typeof LucideIcons]
                const isSelected = iconName === value
                
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handleSelect(iconName)}
                    className={`p-2 rounded-md border hover:bg-muted transition-colors ${
                      isSelected ? "border-primary bg-primary/10" : "border-transparent"
                    }`}
                    title={iconName}
                  >
                    <Icon className="h-5 w-5 mx-auto" />
                  </button>
                )
              })}
            </div>
            
            {filteredIcons.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron íconos
              </p>
            )}
            
            {search && filteredIcons.length >= 100 && (
              <p className="text-center text-muted-foreground text-sm py-2">
                Mostrando los primeros 100 resultados
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Component to render an icon by name
export function Icon({ name, className }: { name: string; className?: string }) {
  const IconComponent = LucideIcons[name as keyof typeof LucideIcons]
  
  if (!IconComponent) {
    return null
  }
  
  return <IconComponent className={className} />
}
