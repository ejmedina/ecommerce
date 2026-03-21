"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [authMode, setAuthMode] = useState<AuthMode>("login")

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: "", confirmPassword: "" },
  })

  async function handleLogin(data: LoginForm) {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      loginForm.setError("root", { message: "Email o contraseña incorrectos" })
      return
    }

    // Small delay to ensure session is set
    setTimeout(() => {
      router.push("/account")
      router.refresh()
    }, 100)
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

      // Auto login after register
      await handleLogin({ email: data.email, password: data.password })
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
