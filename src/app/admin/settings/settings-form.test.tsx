import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SettingsForm } from "./settings-form"

describe("settings form loading", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("shows a retry state instead of editable empty settings when the API fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error al obtener configuración" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<SettingsForm />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Error al obtener configuración")
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/settings", { cache: "no-store" })
  })
})
