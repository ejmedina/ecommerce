"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Mail } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginForm = z.infer<typeof loginSchema>

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(8, "El teléfono debe tener al menos 8 dígitos"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

type AuthMode = "login" | "register"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/account"
  const { toast } = useToast()
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: "", confirmPassword: "" },
  })

  // Auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        const session = await res.json()
        if (session && Object.keys(session).length > 0) {
          router.replace(returnUrl)
        }
      } catch (e) {
        // Ignorar errores de red
      }
    }
    
    // No redirigir si el usuario acaba de registrarse (queremos mostrar el mensaje de éxito)
    if (!registeredEmail) {
      checkSession()
    }
  }, [router, returnUrl, registeredEmail])

  // Effect para procesar acción pendiente después del login
  useEffect(() => {
    const processPendingAction = async () => {
      const pendingActionStr = sessionStorage.getItem("pendingAction")
      if (!pendingActionStr) return

      try {
        const pendingAction = JSON.parse(pendingActionStr)
        
        // Verificar si el usuario tiene permisos de admin
        const response = await fetch("/api/auth/check-admin")
        const { isAdmin } = await response.json()

        if (!isAdmin) {
          // No tiene permisos, limpiar y redirigir a home
          sessionStorage.removeItem("pendingAction")
          toast({
            title: "Acceso denegado",
            description: "No tienes permisos para realizar esta acción",
            variant: "destructive",
          })
          router.push("/")
          return
        }

        // Tiene permisos, ejecutar la acción
        if (pendingAction.action === "createRouteSheet") {
          const result = await fetch("/api/admin/route-sheet/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pendingAction.routeName,
              orderIds: pendingAction.orderIds,
              date: pendingAction.routeDate,
            }),
          })
          
          const data = await result.json()
          
          if (data.routeSheet) {
            sessionStorage.removeItem("pendingAction")
            router.push(`/admin/routes/${data.routeSheet.id}`)
          } else {
            toast({
              title: "Error",
              description: data.error || "Error al crear la hoja de ruta",
              variant: "destructive",
            })
            router.push(returnUrl)
          }
        }
      } catch (error) {
        console.error("Error processing pending action:", error)
        router.push(returnUrl)
      }
    }

    // Solo procesar si hay un returnUrl de admin
    if (returnUrl.includes("/admin")) {
      processPendingAction()
    }
  }, [returnUrl, router, toast])

  async function handleLogin(data: LoginForm) {
    const result = await (signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    }) as Promise<{ error: string | null; url: string | null }>)

    if (result?.error) {
      loginForm.setError("root", { message: "Email o contraseña incorrectos" })
      return
    }

    // Aseguramos que el returnUrl sea válido y no apunte de nuevo al login
    const target = (returnUrl && !returnUrl.includes("/login")) ? returnUrl : "/account"
    
    // Forzamos un refresco completo para asegurar la sesión
    window.location.href = target
    
    // Retraso opcional para evitar que el botón se desbloquee inmediatamente
    // mientras el navegador procesa la nueva petición.
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  async function handleRegister(data: RegisterForm) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        registerForm.setError("root", { message: error.message || "Error al registrarse" })
        return
      }

      // Show success message instead of auto-login
      setRegisteredEmail(data.email)
      registerForm.reset()
    } catch {
      registerForm.setError("root", { message: "Error al registrarse" })
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              {authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </CardTitle>
            <CardDescription>
              {authMode === "login" 
                ? "Ingresá a tu cuenta para hacer seguimiento de tus pedidos" 
                : "Registrate para hacer seguimiento de tus pedidos"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Success message after registration */}
            {registeredEmail && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-green-800">¡Cuenta creada!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Te enviamos un email de verificación a <strong>{registeredEmail}</strong>.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Revisá tu casilla y hacé clic en el enlace para activar tu cuenta.
                    </p>
                    <Button
                      variant="link"
                      className="text-green-700 p-0 h-auto mt-3"
                      onClick={() => {
                        setRegisteredEmail(null)
                        setAuthMode("login")
                        loginForm.setValue("email", registeredEmail)
                      }}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Ir a iniciar sesión
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                {loginForm.formState.errors.root && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.root.message}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? "Cargando..." : "Iniciar sesión"}
                </Button>
                <p className="text-center text-sm text-muted-foreground pt-2">
                  ¿No tenés cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className="text-primary hover:underline"
                  >
                    Registrate acá
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                {registerForm.formState.errors.root && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.root.message}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nombre</Label>
                  <Input
                    id="register-name"
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">Teléfono</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="11 1234 5678"
                    {...registerForm.register("phone")}
                  />
                  {registerForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm">Confirmar contraseña</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    {...registerForm.register("confirmPassword")}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? "Cargando..." : "Crear cuenta"}
                </Button>
                <p className="text-center text-sm text-muted-foreground pt-2">
                  ¿Ya tenés cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="text-primary hover:underline"
                  >
                    Iniciá sesión
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/" className="hover:underline">Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}
