import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { parseImportedPrice, parsePriceImportWorkbook } from "./parser"

describe("price import parser", () => {
  it("parses Argentine-style prices", () => {
    expect(parseImportedPrice("$5.095")).toBe(5095)
    expect(parseImportedPrice("$9.840")).toBe(9840)
    expect(parseImportedPrice("5.095,50")).toBe(5095.5)
    expect(parseImportedPrice("5095.50")).toBe(5095.5)
  })

  it("parses the first worksheet using required headers", () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ["LINEA", "MARCA", "Codigo", "Descripcion", "Lista", "Redondeo Combo x 2"],
      ["Pan", "Bimbo", "965246", "Pan Blanco CM 1p 580g BOLSA BIM", "$5.095", "$9.840"],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, "Lista")

    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const result = parsePriceImportWorkbook(buffer, "bimbo.xlsx")

    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      providerCode: "965246",
      providerDescription: "Pan Blanco CM 1p 580g BOLSA BIM",
      unitPrice: 5095,
      comboPrice: 9840,
    })
  })

  it("detects headers below leading metadata rows and accepts Bimbo price aliases", () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ["", "", "", "", "", "", "", "", "1.28", "1.4", "1.45", "2"],
      [
        "LINEA",
        "MARCA",
        "SUBLINEA",
        "Codigo",
        "Descripcion",
        "Precios de lista ",
        "Descuento",
        "Precio Neto",
        "Impuesto",
        "Precio Combo",
        "Precio Unitario",
        "Combo x 2",
      ],
      [
        "01 Pan de Molde",
        "Bimbo",
        "Panes Blancos",
        "965246",
        "Pan Blanco CM 1p 580g BOLSA BIM",
        "$3,348.70",
        "18%",
        "$2,745.93",
        "$3,514.80",
        "$4,920.71",
        "$5,096.45",
        "$9,841.43",
      ],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1")

    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const result = parsePriceImportWorkbook(buffer, "lista-bimbo.xlsx")

    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({
      providerCode: "965246",
      unitPrice: 5096.45,
      comboPrice: 9841.43,
    })
  })

  it("prefers rounded Lista columns when both raw and rounded Bimbo prices exist", () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ["", "", "", "", "", "", "", "", "1.28", "1.4", "1.45", "2"],
      [
        "LINEA",
        "MARCA",
        "SUBLINEA",
        "Codigo",
        "Descripcion",
        "Precios de lista ",
        "Descuento",
        "Precio Neto",
        "Impuesto",
        "Precio Combo",
        "Precio Unitario",
        "Combo x 2",
        "Lista ",
        "Redondeo Combo x 2",
      ],
      [
        "01 Pan de Molde",
        "Bimbo",
        "Panes Blancos",
        "965246",
        "Pan Blanco CM 1p 580g BOLSA BIM",
        "$3,348.70",
        "18%",
        "$2,745.93",
        "$3,514.80",
        "$4,920.71",
        "$5,096.45",
        "$9,841.43",
        "$5,095.00",
        "$9,840.00",
      ],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1")

    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const result = parsePriceImportWorkbook(buffer, "lista-bimbo.xlsx")

    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({
      providerCode: "965246",
      unitPrice: 5095,
      comboPrice: 9840,
    })
  })

  it("reports missing columns", () => {
    const csv = "Codigo,Descripcion,Lista\n1,Producto,10"
    const result = parsePriceImportWorkbook(new TextEncoder().encode(csv).buffer, "lista.csv")

    expect(result.errors[0]).toContain("Redondeo Combo x 2")
    expect(result.rows).toEqual([])
  })

  it("flags duplicate provider codes", () => {
    const csv = [
      "Codigo,Descripcion,Lista,Redondeo Combo x 2",
      "1,Producto A,100,190",
      "1,Producto A bis,110,200",
    ].join("\n")

    const result = parsePriceImportWorkbook(new TextEncoder().encode(csv).buffer, "lista.csv")

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].warnings).toContain("Código proveedor duplicado en la planilla.")
    expect(result.rows[1].warnings).toContain("Código proveedor duplicado en la planilla.")
  })
})
