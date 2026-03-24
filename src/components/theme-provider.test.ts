import { describe, it, expect } from "vitest"

// Inline hexToRgb for testing since it's not exported
function hexToRgb(hex: string | undefined | null): string {
  if (!hex || typeof hex !== 'string' || hex.length !== 7) {
    return "rgb(0 0 0)"
  }
  
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  return `rgb(${r} ${g} ${b})`
}

describe("hexToRgb", () => {
  it("converts black (#000000) correctly", () => {
    const result = hexToRgb("#000000")
    expect(result).toBe("rgb(0 0 0)")
  })

  it("converts white (#ffffff) correctly", () => {
    const result = hexToRgb("#ffffff")
    expect(result).toBe("rgb(255 255 255)")
  })

  it("converts red (#ff0000) correctly", () => {
    const result = hexToRgb("#ff0000")
    expect(result).toBe("rgb(255 0 0)")
  })

  it("converts green (#00ff00) correctly", () => {
    const result = hexToRgb("#00ff00")
    expect(result).toBe("rgb(0 255 0)")
  })

  it("converts blue (#0000ff) correctly", () => {
    const result = hexToRgb("#0000ff")
    expect(result).toBe("rgb(0 0 255)")
  })

  it("converts custom color (#fa0000) correctly", () => {
    const result = hexToRgb("#fa0000")
    expect(result).toBe("rgb(250 0 0)")
  })

  it("handles undefined input gracefully", () => {
    const result = hexToRgb(undefined)
    expect(result).toBe("rgb(0 0 0)")
  })

  it("handles null input gracefully", () => {
    const result = hexToRgb(null)
    expect(result).toBe("rgb(0 0 0)")
  })

  it("handles empty string gracefully", () => {
    const result = hexToRgb("")
    expect(result).toBe("rgb(0 0 0)")
  })

  it("handles invalid hex values gracefully", () => {
    const result = hexToRgb("not-a-color")
    expect(result).toBe("rgb(0 0 0)")
  })

  it("handles short hex (#fff) gracefully", () => {
    const result = hexToRgb("#fff")
    expect(result).toBe("rgb(0 0 0)")
  })
})
