import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendEmail } from "@/lib/email"

const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresá un nombre válido."),
  email: z.email("Ingresá un email válido."),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  interest: z.string().trim().min(2, "Seleccioná un interés."),
  message: z.string().trim().min(10, "Contanos un poco más sobre tu consulta."),
  company: z.string().trim().max(0).optional().or(z.literal("")),
})

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = contactSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 }
      )
    }

    const { name, email, organization, interest, message, company } = parsed.data

    // Honeypot field: if it is filled, pretend success and discard the request.
    if (company) {
      return NextResponse.json({ success: true })
    }

    const recipient = process.env.CONTACT_FORM_TO || "comercial@pgi.com.ar"

    const result = await sendEmail({
      to: recipient,
      subject: `[PGI] Nueva consulta desde la home institucional`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Nueva consulta institucional</h1>
          <p style="margin-top: 0; color: #475569;">Se recibió un nuevo mensaje desde la home institucional de PGI.</p>

          <div style="margin-top: 24px; padding: 20px; border: 1px solid #d1fae5; border-radius: 16px; background: #f0fdf4;">
            <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Empresa o proyecto:</strong> ${escapeHtml(organization || "No informado")}</p>
            <p><strong>Interés principal:</strong> ${escapeHtml(interest)}</p>
            <p><strong>Mensaje:</strong></p>
            <p style="white-space: pre-wrap; line-height: 1.7;">${escapeHtml(message)}</p>
          </div>
        </div>
      `,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "El formulario todavía no está configurado para envío en este entorno. Podés continuar por WhatsApp mientras terminamos esa integración.",
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact route error:", error)
    return NextResponse.json(
      { error: "No pudimos procesar la consulta." },
      { status: 500 }
    )
  }
}
