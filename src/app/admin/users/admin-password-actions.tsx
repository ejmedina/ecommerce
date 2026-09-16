"use client"

import { useState, useTransition } from "react"
import { KeyRound, Mail, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendUserPasswordReset, setUserPasswordByAdmin } from "./actions"

export function AdminPasswordActions({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function sendRecoveryEmail() {
    if (!window.confirm("¿Enviar un email de recuperación de contraseña a este usuario?")) return
    setMessage("")
    setError("")
    startTransition(async () => {
      const result = await sendUserPasswordReset(userId)
      if (result.error) {
        setError(result.error)
        return
      }
      setMessage("Email de recuperación enviado.")
    })
  }

  function handleSetPassword() {
    setMessage("")
    setError("")
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (!window.confirm("¿Confirmás que querés reemplazar la contraseña actual? El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.")) return

    startTransition(async () => {
      const result = await setUserPasswordByAdmin(userId, password)
      if (result.error) {
        setError(result.error)
        return
      }
      setPassword("")
      setConfirmPassword("")
      setMessage("Contraseña actualizada. Compartila con el usuario por un canal seguro.")
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Enviar recuperación</p>
          <p className="text-sm text-muted-foreground">El usuario elegirá su propia contraseña desde un enlace de un solo uso.</p>
        </div>
        <Button type="button" variant="outline" onClick={sendRecoveryEmail} disabled={isPending}>
          <Mail className="mr-1.5 h-4 w-4" />Enviar email
        </Button>
      </div>
      <div className="border-t pt-4">
        <p className="font-medium">Definir contraseña manualmente</p>
        <p className="mt-1 text-sm text-muted-foreground">Usalo solo para soporte excepcional. No guardamos ni registramos la contraseña.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="admin-password">Nueva contraseña</Label><Input id="admin-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div>
          <div className="space-y-2"><Label htmlFor="admin-password-confirm">Confirmar contraseña</Label><Input id="admin-password-confirm" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></div>
        </div>
        <Button type="button" className="mt-3" onClick={handleSetPassword} disabled={isPending || !password || !confirmPassword}>
          <KeyRound className="mr-1.5 h-4 w-4" />Actualizar contraseña
        </Button>
      </div>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="flex gap-1.5 text-sm text-destructive"><ShieldAlert className="h-4 w-4 shrink-0" />{error}</p> : null}
    </div>
  )
}
