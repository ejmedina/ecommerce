import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createAnalyticsItem,
  createEcommercePayload,
  trackEvent,
  trackPurchase,
} from "./analytics"

describe("analytics helpers", () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
    if (globalThis.window) {
      globalThis.window.dataLayer = []
      globalThis.window.gtag = undefined
      globalThis.window.fbq = undefined
      globalThis.window.sessionStorage.clear()
    }
  })

  it("does not throw during SSR", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
      writable: true,
    })

    expect(() => trackEvent("test_event", { value: 1 })).not.toThrow()
  })

  it("pushes events into dataLayer", () => {
    globalThis.window.dataLayer = []

    trackEvent("add_to_cart", { value: 1200 })

    expect(globalThis.window.dataLayer).toEqual([
      { event: "add_to_cart", value: 1200 },
    ])
  })

  it("also sends events to directly configured GA4 and Meta Pixel", () => {
    const gtag = vi.fn()
    const fbq = vi.fn()
    globalThis.window.dataLayer = []
    globalThis.window.gtag = gtag
    globalThis.window.fbq = fbq

    trackEvent("add_to_cart", {
      currency: "ARS",
      value: 1200,
      items: [{ item_id: "pan-1", item_name: "Pan", quantity: 1, price: 1200 }],
    })

    expect(gtag).toHaveBeenCalledWith("event", "add_to_cart", expect.any(Object))
    expect(fbq).toHaveBeenCalledWith("track", "AddToCart", expect.objectContaining({
      content_ids: ["pan-1"],
      value: 1200,
    }))
  })

  it("uses event_id to deduplicate a Meta purchase", () => {
    const fbq = vi.fn()
    globalThis.window.dataLayer = []
    globalThis.window.fbq = fbq

    trackPurchase("order-1", {
      ...createEcommercePayload([], { value: 1000 }),
      transaction_id: "ORD-1",
      event_id: "meta_purchase_order-1",
    })

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.any(Object),
      { eventID: "meta_purchase_order-1" },
    )
  })

  it("deduplicates purchase events by order id", () => {
    globalThis.window.dataLayer = []

    const payload = createEcommercePayload(
      [
        createAnalyticsItem({
          itemId: "prod-1",
          itemName: "Pan",
          price: 1000,
          quantity: 2,
          itemCategory: "Panificados",
        }),
      ],
      { value: 2000 }
    )

    trackPurchase("order-1", {
      ...payload,
      transaction_id: "ORD-1",
      event_id: "meta_purchase_order-1",
    })
    trackPurchase("order-1", {
      ...payload,
      transaction_id: "ORD-1",
      event_id: "meta_purchase_order-1",
    })

    expect(globalThis.window.dataLayer).toHaveLength(1)
    expect(globalThis.window.dataLayer?.[0]).toMatchObject({
      event: "purchase",
      transaction_id: "ORD-1",
      value: 2000,
    })
  })
})
