export const TRACKING_CURRENCY = "ARS" as const

export interface AnalyticsItem {
  item_id: string
  item_name: string
  price?: number
  quantity?: number
  item_category?: string
  item_variant?: string
}

export interface EcommerceEventPayload {
  currency: typeof TRACKING_CURRENCY
  value?: number
  shipping?: number
  tax?: number
  items: AnalyticsItem[]
}

interface AnalyticsItemInput {
  itemId: string
  itemName: string
  price?: number | null
  quantity?: number
  itemCategory?: string | null
  itemVariant?: string | null
}

type DataLayerEvent = {
  event: string
} & Record<string, unknown>

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[]
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

function isBrowser() {
  return typeof window !== "undefined"
}

function normalizeNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function trackEvent(
  eventName: string,
  payload: object = {}
): void {
  if (!isBrowser()) return

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: eventName,
    ...payload,
  })

  // GoogleAnalytics (the direct fallback) exposes gtag. With GTM this is
  // intentionally absent: GTM consumes the dataLayer event instead.
  window.gtag?.("event", eventName, payload)
  trackMetaEvent(eventName, payload)
}

function trackMetaEvent(eventName: string, payload: object): void {
  if (!window.fbq) return

  const ecommerce = payload as Partial<EcommerceEventPayload>
  const firstItem = ecommerce.items?.[0]
  const eventParams = {
    currency: ecommerce.currency,
    value: ecommerce.value,
    content_ids: ecommerce.items?.map((item) => item.item_id),
    content_type: "product",
    content_name: firstItem?.item_name,
    contents: ecommerce.items?.map((item) => ({
      id: item.item_id,
      quantity: item.quantity ?? 1,
      item_price: item.price,
    })),
  }

  const metaEventByStoreEvent: Record<string, string> = {
    view_item: "ViewContent",
    add_to_cart: "AddToCart",
    remove_from_cart: "RemoveFromCart",
    begin_checkout: "InitiateCheckout",
    purchase: "Purchase",
    search: "Search",
  }
  const metaEvent = metaEventByStoreEvent[eventName]

  if (metaEvent) {
    if (eventName === "search") {
      window.fbq("track", metaEvent, { search_string: (payload as { search_term?: unknown }).search_term })
      return
    }

    const eventId = (payload as { event_id?: unknown }).event_id
    if (typeof eventId === "string") {
      window.fbq("track", metaEvent, eventParams, { eventID: eventId })
    } else {
      window.fbq("track", metaEvent, eventParams)
    }
  }
}

export function createAnalyticsItem({
  itemId,
  itemName,
  price,
  quantity,
  itemCategory,
  itemVariant,
}: AnalyticsItemInput): AnalyticsItem {
  return {
    item_id: itemId,
    item_name: itemName,
    ...(normalizeNumber(price) !== undefined ? { price: normalizeNumber(price) } : {}),
    ...(typeof quantity === "number" ? { quantity } : {}),
    ...(itemCategory ? { item_category: itemCategory } : {}),
    ...(itemVariant ? { item_variant: itemVariant } : {}),
  }
}

export function createEcommercePayload(
  items: AnalyticsItem[],
  extras: Omit<EcommerceEventPayload, "currency" | "items"> = {}
): EcommerceEventPayload {
  return {
    currency: TRACKING_CURRENCY,
    ...extras,
    items,
  }
}

export function trackViewItem(payload: EcommerceEventPayload): void {
  trackEvent("view_item", payload)
}

export function trackAddToCart(payload: EcommerceEventPayload): void {
  trackEvent("add_to_cart", payload)
}

export function trackRemoveFromCart(payload: EcommerceEventPayload): void {
  trackEvent("remove_from_cart", payload)
}

export function trackBeginCheckout(payload: EcommerceEventPayload): void {
  trackEvent("begin_checkout", payload)
}

export function trackViewCart(payload: EcommerceEventPayload): void {
  trackEvent("view_cart", payload)
}

export function trackSearch(searchTerm: string): void {
  trackEvent("search", { search_term: searchTerm })
}

export function trackSelectItem(payload: EcommerceEventPayload): void {
  trackEvent("select_item", payload)
}

export function trackPurchase(
  orderId: string,
  payload: EcommerceEventPayload & { transaction_id: string; event_id: string }
): void {
  if (!isBrowser()) return

  const storageKey = `tracked_purchase_${orderId}`
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      return
    }
  } catch {
    // Ignore storage access issues and still attempt to track once for this render.
  }

  trackEvent("purchase", payload)

  try {
    window.sessionStorage.setItem(storageKey, "1")
  } catch {
    // Ignore storage access issues.
  }
}

export function trackLogin(method = "credentials"): void {
  trackEvent("login", { method })
}

export function trackSignUp(method = "credentials"): void {
  trackEvent("sign_up", { method })
}
