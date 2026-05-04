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
  payload: Record<string, unknown> = {}
): void {
  if (!isBrowser()) return

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: eventName,
    ...payload,
  })
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

export function trackSearch(searchTerm: string): void {
  trackEvent("search", { search_term: searchTerm })
}

export function trackSelectItem(payload: EcommerceEventPayload): void {
  trackEvent("select_item", payload)
}

export function trackPurchase(
  orderId: string,
  payload: EcommerceEventPayload & { transaction_id: string }
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
