import { Resend } from "resend"
import { db } from "@/lib/db"

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

const FROM_EMAIL = process.env.EMAIL_FROM || "El Pan a tu Casa <no-responder@elpanatucasa.com.ar>"

/**
 * Get the store URL from database settings, environment variable, or default
 * Priority: 1. StoreSettings.storeUrl (DB) > 2. NEXT_PUBLIC_APP_URL (env) > 3. localhost:3000
 */
export async function getStoreUrl(): Promise<string> {
  try {
    // 1. Try store settings from database
    const settings = await db.storeSettings.findFirst()
    if (settings?.storeUrl) {
      return settings.storeUrl
    }
  } catch (error) {
    console.warn("Failed to get storeUrl from database, falling back to env:", error)
  }

  // 2. Try environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // 3. Default to localhost
  return "http://localhost:3000"
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
}

interface OrderEmailItem {
  name: string
  sku?: string | null
  quantityOrdered: number
  price: unknown
  unitTotal: unknown
}

interface OrderEmailAddress {
  name?: string
  street?: string
  number?: string
  floor?: string | null
  apartment?: string | null
  city?: string
  state?: string
  postalCode?: string
  phone?: string
  instructions?: string | null
}

interface OrderEmailData {
  id: string
  orderNumber: string
  user: {
    email: string
    name?: string | null
  }
  items: OrderEmailItem[]
  subtotal: unknown
  shippingCost: unknown
  total: unknown
  shippingMethod: string
  shippingAddress?: unknown
  paymentMethod?: string
  paymentStatus?: string
  createdAt?: Date
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(value))
}

function isOrderEmailAddress(value: unknown): value is OrderEmailAddress {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!resend) {
    console.warn("Resend not configured - email not sent")
    return { success: false, error: "Resend not configured" }
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error("Email send error:", error)
    return { success: false, error }
  }
}

export async function sendVerificationEmail({
  to,
  token,
  type,
  returnTo,
}: {
  to: string
  token: string
  type: "email_change" | "guest_checkout" | "email_verification" | "migrated_account"
  returnTo?: string | null
}) {
  const baseUrl = await getStoreUrl()
  let verifyUrl: string
  let subject: string
  let description: string
  let buttonLabel: string
  let intro: string
  let ignoreText: string
  const appendCheckoutReturnTo = (url: URL) => {
    if (returnTo === "/checkout") {
      url.searchParams.set("returnTo", returnTo)
    }
    return url.toString()
  }

  if (type === "email_change") {
    verifyUrl = `${baseUrl}/auth/verify-email-change?token=${token}`
    subject = "Verificá tu nuevo email en El Pan a tu Casa"
    description = "Hacé clic en el enlace para confirmar tu nuevo email."
    buttonLabel = "Verificar mi email"
    intro = "Recibimos una solicitud para cambiar el email de tu cuenta en El Pan a tu Casa."
    ignoreText = "Si no solicitaste este cambio, podés ignorar este mensaje."
  } else if (type === "guest_checkout") {
    verifyUrl = `${baseUrl}/auth/set-password?token=${token}`
    subject = "Completá tu registro en El Pan a tu Casa"
    description = "Hacé clic en el enlace para configurar tu contraseña."
    buttonLabel = "Completar mi registro"
    intro = "Gracias por comprar en El Pan a tu Casa."
    ignoreText = "Si no solicitaste este registro, podés ignorar este mensaje."
  } else if (type === "migrated_account") {
    const verificationUrl = new URL("/auth/set-password", baseUrl)
    verificationUrl.searchParams.set("token", token)
    verifyUrl = appendCheckoutReturnTo(verificationUrl)
    subject = "Activá tu cuenta en el nuevo El Pan a tu Casa"
    description = "Validá tu email y creá una contraseña nueva para ingresar por primera vez."
    buttonLabel = "Activar mi cuenta"
    intro = "Encontramos una cuenta asociada a compras anteriores en nuestro sitio anterior."
    ignoreText = "Si no reconocés esta cuenta, podés ignorar este mensaje."
  } else {
    // email_verification - new user registration
    const verificationUrl = new URL("/auth/verify-email", baseUrl)
    verificationUrl.searchParams.set("token", token)
    verifyUrl = appendCheckoutReturnTo(verificationUrl)
    subject = "Verificá tu cuenta en El Pan a tu Casa"
    description = "Para activar tu cuenta, hacé clic en el siguiente botón."
    buttonLabel = "Verificar mi cuenta"
    intro = "Gracias por registrarte en El Pan a tu Casa."
    ignoreText = "Si no creaste una cuenta en El Pan a tu Casa, podés ignorar este mensaje."
  }

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2933; line-height: 1.5;">
      <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">${subject}</h1>
      <p style="font-size: 16px; margin: 0 0 12px;">Hola,</p>
      <p style="font-size: 16px; margin: 0 0 12px;">${intro}</p>
      <p style="font-size: 16px; margin: 0 0 20px;">${description}</p>
      <a href="${verifyUrl}" style="display: inline-block; background-color: #0a0a0a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        ${buttonLabel}
      </a>
      <p style="color: #4b5563; font-size: 14px; margin-top: 24px;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
        <a href="${verifyUrl}" style="color: #0a0a0a; word-break: break-all;">${verifyUrl}</a>
      </p>
      <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">${ignoreText}</p>
      <p style="font-size: 16px; margin-top: 24px;">Saludos,<br/>El equipo de El Pan a tu Casa</p>
    </div>
  `

  return sendEmail({ to, subject, html })
}

export async function sendOrderConfirmationEmail(order: OrderEmailData) {
  const baseUrl = await getStoreUrl()
  const to = order.user.email
  const subject = `Confirmación de pedido #${order.orderNumber}`

  const itemsHtml = order.items.map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.name}<br/>
        <small style="color: #666;">SKU: ${item.sku || 'N/A'}</small>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantityOrdered}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.price).toLocaleString()}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.unitTotal).toLocaleString()}</td>
    </tr>
  `).join("")

  const shippingAddress = isOrderEmailAddress(order.shippingAddress) ? order.shippingAddress : null
  const addressHtml = order.shippingMethod === "pickup" 
    ? "<p><strong>Retiro en tienda</strong></p>"
    : `
      <p><strong>Dirección de envío:</strong><br/>
      ${shippingAddress?.street || ""} ${shippingAddress?.number || ""}${shippingAddress?.floor ? `, Piso ${shippingAddress.floor}` : ""}${shippingAddress?.apartment ? `, Depto ${shippingAddress.apartment}` : ""}<br/>
      ${shippingAddress?.city || ""}, ${shippingAddress?.state || ""} (${shippingAddress?.postalCode || ""})<br/>
      ${shippingAddress?.phone || ""}
      </p>
    `

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="border-bottom: 2px solid #000; padding-bottom: 10px;">¡Gracias por tu compra!</h1>
      <p>Hola ${order.user.name || "cliente"},</p>
      <p>Hemos recibido tu pedido <strong>#${order.orderNumber}</strong> y lo estamos procesando.</p>
      
      <h2 style="font-size: 18px; margin-top: 20px;">Detalle del pedido</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 10px; text-align: left;">Producto</th>
            <th style="padding: 10px; text-align: center;">Cant.</th>
            <th style="padding: 10px; text-align: right;">Precio</th>
            <th style="padding: 10px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="text-align: right; margin-top: 20px;">
        <p style="margin: 5px 0;">Subtotal: $${Number(order.subtotal).toLocaleString()}</p>
        <p style="margin: 5px 0;">Envío: ${Number(order.shippingCost) === 0 ? "Gratis" : `$${Number(order.shippingCost).toLocaleString()}`}</p>
        <p style="margin: 5px 0; font-size: 18px; font-bold;"><strong>Total: $${Number(order.total).toLocaleString()}</strong></p>
      </div>
      
      <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
        ${addressHtml}
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Podés ver el estado de tu pedido en cualquier momento haciendo clic acá: 
        <a href="${baseUrl}/account/orders/${order.id}">Ver mi pedido</a>
      </p>
      
      <p style="margin-top: 20px;">Si tenés alguna duda, respondé a este email o contactanos por WhatsApp.</p>
    </div>
  `

  return sendEmail({ to, subject, html })
}

const paymentMethodLabels: Record<string, string> = {
  ONLINE_CARD: "Pago online",
  BANK_TRANSFER: "Transferencia bancaria",
  DIGITAL_WALLET: "Billetera digital",
  CASH_ON_DELIVERY: "Efectivo contra entrega",
  CARD_ON_DELIVERY: "Tarjeta contra entrega",
  TRANSFER_ON_DELIVERY: "Transferencia contra entrega",
}

export async function sendNewOrderNotificationEmail(
  order: OrderEmailData,
  recipients: string[],
  timeZone = "America/Argentina/Buenos_Aires",
) {
  const address = isOrderEmailAddress(order.shippingAddress) ? order.shippingAddress : null
  const createdAt = order.createdAt ?? new Date()
  const itemsHtml = order.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}${item.sku ? `<br><small>SKU: ${escapeHtml(item.sku)}</small>` : ""}</td>
      <td style="text-align:center">${item.quantityOrdered}</td>
      <td style="text-align:right">${formatMoney(item.price)}</td>
      <td style="text-align:right">${formatMoney(item.unitTotal)}</td>
    </tr>
  `).join("")
  const deliveryHtml = order.shippingMethod === "pickup"
    ? "<strong>Retiro en tienda</strong>"
    : `${escapeHtml(address?.street)} ${escapeHtml(address?.number)}${address?.floor ? `, Piso ${escapeHtml(address.floor)}` : ""}${address?.apartment ? `, Depto. ${escapeHtml(address.apartment)}` : ""}<br>${escapeHtml(address?.city)}, ${escapeHtml(address?.state)} (${escapeHtml(address?.postalCode)})`

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#111;margin:0;padding:24px} .sheet{max-width:760px;margin:auto}
    h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #999;padding-bottom:5px}
    p{margin:5px 0;line-height:1.4} table{border-collapse:collapse;width:100%;font-size:14px} th,td{border:1px solid #bbb;padding:8px} th{background:#eee;text-align:left}
    .totals{margin-left:auto;margin-top:12px;width:280px}.totals td{border:0;padding:3px 0}.total{font-size:18px;font-weight:bold;border-top:1px solid #555!important;padding-top:7px!important}
    .note{border:1px solid #999;padding:10px;white-space:pre-wrap}.muted{color:#555;font-size:13px}
    @media print{body{padding:0}.sheet{max-width:none}a{color:#111;text-decoration:none}}
  </style></head><body><main class="sheet">
    <h1>Pedido ${escapeHtml(order.orderNumber)}</h1>
    <p class="muted">Recibido el ${escapeHtml(new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeStyle: "short", timeZone }).format(createdAt))}</p>
    <h2>Cliente</h2>
    <p><strong>${escapeHtml(order.user.name || "Sin nombre")}</strong><br>${escapeHtml(order.user.email)}${address?.phone ? `<br>Tel.: ${escapeHtml(address.phone)}` : ""}</p>
    <h2>Entrega</h2><p>${deliveryHtml}</p>
    ${address?.instructions ? `<p class="note"><strong>Indicaciones:</strong><br>${escapeHtml(address.instructions)}</p>` : ""}
    <h2>Detalle del pedido</h2>
    <table><thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    <table class="totals"><tr><td>Subtotal</td><td style="text-align:right">${formatMoney(order.subtotal)}</td></tr><tr><td>Envío</td><td style="text-align:right">${formatMoney(order.shippingCost)}</td></tr><tr><td class="total">Total</td><td class="total" style="text-align:right">${formatMoney(order.total)}</td></tr></table>
    <h2>Pago</h2><p>${escapeHtml(paymentMethodLabels[order.paymentMethod || ""] || order.paymentMethod || "Sin especificar")} · Estado: ${escapeHtml(order.paymentStatus || "PENDING")}</p>
  </main></body></html>`

  return sendEmail({
    to: recipients,
    subject: `Nuevo pedido ${order.orderNumber} — ${order.user.name || order.user.email}`,
    html,
  })
}
