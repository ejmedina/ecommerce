import { createHash } from "node:crypto"
import { decryptSecret } from "@/lib/secret-encryption"
import { db } from "@/lib/db"

interface MetaPurchaseItem {
  productId: string
  variantId: string | null
  name: string
  price: unknown
  quantityOrdered: number
}

interface SendMetaPurchaseInput {
  storeSettingsId: string | null | undefined
  orderId: string
  orderNumber: string
  total: unknown
  shippingCost: unknown
  taxAmount: unknown
  items: MetaPurchaseItem[]
  email?: string | null
  phone?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
}

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

/**
 * Sends the same Purchase as the browser Pixel. The stable event id is what
 * lets Meta count it once when both browser and server deliveries succeed.
 */
export async function sendMetaPurchaseEvent(input: SendMetaPurchaseInput): Promise<void> {
  if (!input.storeSettingsId) return

  const settings = await db.storeSettings.findUnique({
    where: { id: input.storeSettingsId },
    select: {
      metaPixelId: true,
      storeUrl: true,
      analyticsSecret: {
        select: {
          metaCapiAccessTokenCiphertext: true,
          metaCapiAccessTokenIv: true,
          metaCapiAccessTokenAuthTag: true,
        },
      },
    },
  })
  const secret = settings?.analyticsSecret
  if (
    !settings?.metaPixelId ||
    !/^\d+$/.test(settings.metaPixelId) ||
    !secret?.metaCapiAccessTokenCiphertext ||
    !secret.metaCapiAccessTokenIv ||
    !secret.metaCapiAccessTokenAuthTag
  ) return

  const accessToken = decryptSecret({
    ciphertext: secret.metaCapiAccessTokenCiphertext,
    iv: secret.metaCapiAccessTokenIv,
    authTag: secret.metaCapiAccessTokenAuthTag,
  })
  const eventId = `meta_purchase_${input.orderId}`
  const userData: Record<string, string> = {}
  if (input.email) userData.em = sha256(input.email)
  if (input.phone) userData.ph = sha256(input.phone.replace(/\D/g, ""))
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent

  const graphApiVersion = /^v\d+\.\d+$/.test(process.env.META_GRAPH_API_VERSION || "")
    ? process.env.META_GRAPH_API_VERSION!
    : "v23.0"
  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${settings.metaPixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          event_source_url: `${(settings.storeUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/checkout/success`,
          user_data: userData,
          custom_data: {
            currency: "ARS",
            value: Number(input.total),
            shipping: Number(input.shippingCost),
            tax: Number(input.taxAmount),
            order_id: input.orderNumber,
            content_type: "product",
            content_ids: input.items.map((item) => item.variantId || item.productId),
            contents: input.items.map((item) => ({
              id: item.variantId || item.productId,
              quantity: item.quantityOrdered,
              item_price: Number(item.price),
            })),
          },
        }],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Meta Conversions API respondió ${response.status}`)
  }
}
