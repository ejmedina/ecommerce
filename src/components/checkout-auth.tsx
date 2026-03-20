"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail } from "lucide-react"

export function CheckoutAuth() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" })
  const [guestEmail, setGuestEmail] = useState("")
  const [guestSent, setGuestSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestEmail) return
    
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/guest-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: guestEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error")
      }

      setGuestSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>¿Ya tenés cuenta?</CardTitle>
          <CardDescription>
            Iniciá sesión para una experiencia más rápida, o continuá como invitado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Crear cuenta</TabsTrigger>
              <TabsTrigger value="guest">Invitado</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Iniciar sesión
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4 pt-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name">Nombre</Label>
                  <Input
                    id="register-name"
                    value={registerData.name}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>

            {/* Guest Tab */}
            <TabsContent value="guest" className="space-y-4 pt-4">
              <div className="text-center mb-4">
                <Mail className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <h3 className="font-medium">Checkout como invitado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ingresá tu email para continuar. Te enviaremos un link para crear tu contraseña después de completar el pedido.
                </p>
              </div>
              <form onSubmit={handleGuestCheckout} className="space-y-4">
                <div>
                  <Label htmlFor="guest-email">Email</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || guestSent}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {guestSent ? "¡Listo! Continuar" : "Continuar como invitado"}
                </Button>
                {guestSent && (
                  <p className="text-sm text-center text-green-600">
                    ¡Revisá tu email! Te enviamos un link para crear tu contraseña.
                  </p>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
