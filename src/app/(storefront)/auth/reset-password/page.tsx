"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"checking" | "ready" | "success" | "error">(token ? "checking" : "error")
  const [message, setMessage] = useState(token ? "" : "El enlace es inválido o expiró.")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (!token) return

    async function validateToken() {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || "El enlace es inválido o expiró.")
        setStatus("ready")
      } catch (error) {
        console.error("Password reset token validation failed in the browser", { error })
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "No pudimos validar el enlace.")
      }
    }

    validateToken()
  }, [token])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.")
      return
    }

    setStatus("checking")
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "No pudimos actualizar la contraseña.")
      setMessage(data.message)
      setStatus("success")
    } catch (error) {
      console.error("Password reset submission failed in the browser", { error })
      setMessage(error instanceof Error ? error.message : "No pudimos actualizar la contraseña.")
      setStatus("error")
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>{status === "success" ? message : "Elegí una contraseña nueva para tu cuenta."}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "checking" ? <Loader2 className="mx-auto h-7 w-7 animate-spin" /> : null}
          {status === "ready" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="password">Nueva contraseña</Label><Input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" /></div>
              <div className="space-y-2"><Label htmlFor="confirm-password">Confirmar contraseña</Label><Input id="confirm-password" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" /></div>
              {message ? <p className="text-sm text-destructive">{message}</p> : null}
              <Button type="submit" className="w-full">Actualizar contraseña</Button>
            </form>
          ) : null}
          {status === "success" ? <Button asChild className="w-full"><Link href="/login"><CheckCircle2 className="mr-2 h-4 w-4" />Iniciar sesión</Link></Button> : null}
          {status === "error" ? <div className="space-y-4"><p className="text-sm text-destructive">{message}</p><Button asChild variant="outline" className="w-full"><Link href="/auth/forgot-password">Solicitar un nuevo enlace</Link></Button></div> : null}
        </CardContent>
      </Card>
    </div>
  )
}
