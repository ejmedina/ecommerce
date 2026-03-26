"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle, XCircle, UserPlus, Lock, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const token = searchParams.get("token")
  
  const [status, setStatus] = useState<"loading" | "verifying" | "success" | "error">("verifying")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  // Initial verification of the token
  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Token no proporcionado o inválido")
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/set-password?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setEmail(data.email)
          setStatus("loading") // Token verified, now show the form
        } else {
          setStatus("error")
          setMessage(data.message || "Enlace de verificación expirado o inválido")
        }
      } catch (error) {
        setStatus("error")
        setMessage("Error al conectar con el servidor")
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setStatus("verifying") // Show loading state during submission

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name, phone }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        toast({
          title: "¡Éxito!",
          description: "Tu registro se ha completado correctamente",
        })
      } else {
        setStatus("loading") // Back to form
        toast({
          title: "Error",
          description: data.message || "Error al completar el registro",
          variant: "destructive",
        })
      }
    } catch (error) {
      setStatus("loading")
      toast({
        title: "Error",
        description: "Error al conectar con el servidor",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "verifying" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Verificando enlace...</CardTitle>
              <CardDescription>
                Por favor espera un momento
              </CardDescription>
            </>
          )}
          
          {(status === "loading") && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Completá tu registro</CardTitle>
              <CardDescription>
                Configurá tu cuenta para el email: <span className="font-semibold text-foreground">{email}</span>
              </CardDescription>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-600">¡Registro completo!</CardTitle>
              <CardDescription>
                Tu cuenta ha sido activada correctamente con tu nueva contraseña.
              </CardDescription>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Enlace inválido</CardTitle>
              <CardDescription>
                {message}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent>
          {status === "loading" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Juan Pérez"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="11 1234 5678"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-6">
                Completar Registro
              </Button>
            </form>
          )}
          
          {status === "success" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ahora podés iniciar sesión para realizar pedidos y gestionar tu cuenta.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Ir a Iniciar Sesión</Link>
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                El enlace puede haber sido utilizado o haber expirado.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Volver al Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  )
}
