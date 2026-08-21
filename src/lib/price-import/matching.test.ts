import { describe, expect, it } from "vitest"
import { buildPriceImportPreview, canApplyPreviewRow } from "./matching"
import type { ParsedPriceImportRow, PriceImportSourceProduct } from "./types"

const baseRow: ParsedPriceImportRow = {
  rowNumber: 2,
  providerCode: "965246",
  providerDescription: "Pan Blanco CM 1p 580g BOLSA BIM",
  unitPrice: 5095,
  comboPrice: 9840,
  raw: {},
  errors: [],
  warnings: [],
}

const products: PriceImportSourceProduct[] = [
  {
    id: "unit",
    name: "Pan Blanco Bimbo 580g",
    price: 5000,
    externalProviderCode: "965246",
    isCombo: false,
    sku: null,
  },
  {
    id: "combo",
    name: "Pan Blanco Bimbo 580g x 2",
    price: 9600,
    externalProviderCode: "965246",
    isCombo: true,
    sku: null,
  },
]

describe("price import matching", () => {
  it("auto-confirms only complete unit + combo external code matches", () => {
    const preview = buildPriceImportPreview([baseRow], products)
    const row = preview.rows[0]

    expect(row.status).toBe("AUTO_MATCH")
    expect(row.unitMatch).toMatchObject({
      productId: "unit",
      matchType: "external_code",
      confirmed: true,
    })
    expect(row.comboMatch).toMatchObject({
      productId: "combo",
      matchType: "external_code",
      confirmed: true,
    })
    expect(canApplyPreviewRow(row)).toBe(true)
  })

  it("requires review when three products share the same external provider code", () => {
    const preview = buildPriceImportPreview(
      [baseRow],
      [
        ...products,
        {
          id: "third",
          name: "Pan Blanco Bimbo extra",
          price: 5000,
          externalProviderCode: "965246",
          isCombo: false,
          sku: null,
        },
      ]
    )

    const row = preview.rows[0]

    expect(row.status).toBe("NEEDS_REVIEW")
    expect(row.warnings.join(" ")).toContain("3 o más productos")
    expect(canApplyPreviewRow(row)).toBe(false)
  })

  it("keeps heuristic suggestions unconfirmed", () => {
    const preview = buildPriceImportPreview(
      [{ ...baseRow, providerCode: "NEW-CODE" }],
      products.map((product) => ({ ...product, externalProviderCode: null }))
    )
    const row = preview.rows[0]

    expect(row.status).toBe("NEEDS_REVIEW")
    expect(row.unitMatch.matchType).toBe("heuristic")
    expect(row.unitMatch.confirmed).toBe(false)
    expect(canApplyPreviewRow(row)).toBe(false)
  })

  it("marks partial external code matches as incomplete", () => {
    const preview = buildPriceImportPreview([baseRow], [products[0]])
    const row = preview.rows[0]

    expect(row.status).toBe("COMBO_NOT_FOUND")
    expect(canApplyPreviewRow(row)).toBe(false)
  })

  it("tracks existing provider-coded products absent from the upload", () => {
    const preview = buildPriceImportPreview([baseRow], [
      ...products,
      {
        id: "missing",
        name: "Producto ausente",
        price: 100,
        externalProviderCode: "MISSING",
        isCombo: false,
        sku: null,
      },
    ])

    expect(preview.missingProviderProducts).toEqual([
      {
        id: "missing",
        name: "Producto ausente",
        price: 100,
        externalProviderCode: "MISSING",
      },
    ])
  })
})
