import { afterEach, describe, expect, it } from "vitest"
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
    })
    trackPurchase("order-1", {
      ...payload,
      transaction_id: "ORD-1",
    })

    expect(globalThis.window.dataLayer).toHaveLength(1)
    expect(globalThis.window.dataLayer?.[0]).toMatchObject({
      event: "purchase",
      transaction_id: "ORD-1",
      value: 2000,
    })
  })
})
