"use client"

import { useState, useTransition } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import type { Audience } from "@/content/institutional-home"
import { Send, ShieldCheck } from "lucide-react"

interface ContactFormState {
  name: string
  email: string
  organization: string
  interest: string
  message: string
  company: string
}

interface InstitutionalContactFormProps {
  audiences: Audience[]
}

const initialState = (defaultAudience: string): ContactFormState => ({
  name: "",
  email: "",
  organization: "",
  interest: defaultAudience,
  message: "",
  company: "",
})

export function InstitutionalContactForm({ audiences }: InstitutionalContactFormProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState<ContactFormState>(initialState(audiences[0]?.label ?? "Hogar y jardín"))

  const handleChange =
    (field: keyof ContactFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        })

        const payload = await response.json()

        if (!response.ok) {
          setErrorMessage(payload.error || "No se pudo enviar la consulta.")
          toast({
            variant: "destructive",
            title: "No pudimos enviar tu consulta",
            description: payload.error || "Revisá los datos e intentá nuevamente.",
          })
          return
        }

        setForm(initialState(audiences[0]?.label ?? "Hogar y jardín"))
        toast({
          variant: "success",
          title: "Consulta enviada",
          description: "Recibimos tu mensaje y vamos a responderte pronto.",
        })
      } catch (error) {
        console.error("Contact form error:", error)
        setErrorMessage("Ocurrió un error inesperado al enviar la consulta.")
        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Intentá nuevamente en unos minutos.",
        })
      }
    })
  }

  return (
    <div className="space-y-5 rounded-[2rem] border border-emerald-950/10 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(11,61,29,0.45)]">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold text-emerald-950">Contacto institucional</h3>
        <p className="text-sm leading-6 text-slate-600">
          Esta primera versión prioriza captar consultas y ordenar el contacto comercial sin sumar fricción.
        </p>
      </div>

      <Alert className="rounded-2xl border-emerald-200 bg-emerald-50/80 text-emerald-950">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Sin captcha en esta etapa</AlertTitle>
        <AlertDescription>
          El formulario ya incluye una protección simple con honeypot y queda listo para sumar captcha o widget conversacional más adelante.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Nombre</Label>
            <Input
              id="contact-name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="nombre@empresa.com"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-organization">Empresa o proyecto</Label>
            <Input
              id="contact-organization"
              value={form.organization}
              onChange={handleChange("organization")}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-interest">Interés principal</Label>
            <select
              id="contact-interest"
              value={form.interest}
              onChange={handleChange("interest")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {audiences.map((audience) => (
                <option key={audience.id} value={audience.label}>
                  {audience.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden">
          <Label htmlFor="contact-company">Empresa</Label>
          <Input
            id="contact-company"
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={handleChange("company")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">Mensaje</Label>
          <Textarea
            id="contact-message"
            value={form.message}
            onChange={handleChange("message")}
            placeholder="Contanos qué tipo de uso estás evaluando y qué necesitás resolver."
            className="min-h-[144px]"
            required
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertTitle>No se pudo enviar el formulario</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" className="w-full rounded-full" isLoading={isPending}>
          <Send className="h-4 w-4" />
          Enviar consulta
        </Button>
      </form>
    </div>
  )
}
