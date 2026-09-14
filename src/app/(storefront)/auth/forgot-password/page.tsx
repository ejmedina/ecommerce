"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "No pudimos procesar la solicitud.")
      setMessage(data.message)
    } catch (error) {
      console.error("Password reset request failed in the browser", { error })
      setError(error instanceof Error ? error.message : "No pudimos procesar la solicitud.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>Ingresá tu email y te enviaremos un enlace para elegir una nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm">{message}</p>
              <Button asChild variant="outline" className="w-full"><Link href="/login">Volver a iniciar sesión</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Mail className="mr-2 h-4 w-4" />
                {isSubmitting ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground"><Link href="/login" className="hover:underline">Volver a iniciar sesión</Link></p>
        </CardContent>
      </Card>
    </div>
  )
}
