"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  pendingEmail: string | null
}

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email,
    phone: user.phone || "",
  })

  // Check if form has changes compared to original user data
  const hasChanges = 
    formData.name !== (user.name || "") ||
    formData.email !== user.email ||
    formData.phone !== (user.phone || "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Error al actualizar el perfil")
        return
      }

      if (data.pendingEmail) {
        setSuccess(`Se envió un email de verificación a ${data.pendingEmail}. Hasta verificarlo, seguirás usando ${user.email}.`)
      } else {
        setSuccess("Perfil actualizado correctamente")
      }

      router.refresh()
    } catch (err) {
      setError("Error al actualizar el perfil")
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
      
      {success && (
        <div className="bg-green-600/10 text-green-600 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {user.pendingEmail && (
        <div className="bg-amber-600/10 text-amber-600 p-3 rounded-lg text-sm">
          Tenés un cambio de email pendiente: <strong>{user.pendingEmail}</strong>. 
          Verificá tu bandeja de entrada para completar el cambio.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Tu nombre"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="tu@email.com"
        />
        {formData.email !== user.email && (
          <p className="text-xs text-amber-600">
            Al cambiar el email, recibirás un link de verificación al nuevo correo. 
            Deberás verificarlo para poder usar el nuevo email.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))}
          placeholder="11 1234 5678"
        />
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          isLoading={isLoading} 
          disabled={!hasChanges} 
          className="w-full"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
