import { beforeEach, describe, expect, it, vi } from "vitest"

const savedSettings = {
  id: "store-1",
  storeName: "El Pan a tu Casa",
  shippingConfig: null,
  paymentMethods: {},
  analyticsSecret: null,
  gtmContainerId: "GTM-ABC123",
  gaMeasurementId: "G-ABC123",
  metaPixelId: "123456789012345",
}

const mockUpdate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
  Object.assign(savedSettings, data)
  return savedSettings
})
const mockDb = {
  storeSettings: {
    findFirst: vi.fn(async () => savedSettings),
    update: mockUpdate,
  },
  $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    storeSettings: { update: mockUpdate },
  })),
}

vi.mock("@/lib/db", () => ({ db: mockDb }))
vi.mock("@/lib/admin-auth", () => ({ requireAuth: vi.fn(async () => null) }))

describe("admin settings tracking persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedSettings.gtmContainerId = "GTM-ABC123"
    savedSettings.gaMeasurementId = "G-ABC123"
    savedSettings.metaPixelId = "123456789012345"
  })

  async function save(body: Record<string, unknown>) {
    const { PUT } = await import("./route")
    return PUT(new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ id: savedSettings.id, ...body }),
    }) as never)
  }

  it("preserves tracking IDs when another settings screen sends a partial update", async () => {
    const response = await save({ shippingConfig: { zones: [] } })
    const { GET } = await import("./route")
    const loaded = await (await GET()).json()

    expect(response.status).toBe(200)
    expect(Object.hasOwn(mockUpdate.mock.calls[0][0].data, "metaPixelId")).toBe(false)
    expect(loaded.metaPixelId).toBe("123456789012345")
    expect(loaded.gtmContainerId).toBe("GTM-ABC123")
    expect(loaded.gaMeasurementId).toBe("G-ABC123")
  })

  it("saves a new Meta Pixel ID and allows an explicit clear", async () => {
    const { GET } = await import("./route")

    expect((await save({ metaPixelId: " 987654321 " })).status).toBe(200)
    expect((await (await GET()).json()).metaPixelId).toBe("987654321")

    expect((await save({ metaPixelId: null })).status).toBe(200)
    expect((await (await GET()).json()).metaPixelId).toBeNull()
  })
})
