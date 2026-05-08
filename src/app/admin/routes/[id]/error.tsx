"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RouteSheetErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

function getErrorPayload(error: Error & { digest?: string }) {
  return {
    source: "admin-route-sheet-detail",
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    message: error.message,
    name: error.name,
    digest: error.digest,
    stack: error.stack,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  }
}

export default function RouteSheetError({ error, reset }: RouteSheetErrorProps) {
  useEffect(() => {
    const payload = getErrorPayload(error)
    console.error("[ADMIN_ROUTE_SHEET_DETAIL_ERROR]", payload)

    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((reportError) => {
      console.error("[CLIENT_ERROR_REPORT_FAILED]", reportError)
    })
  }, [error])

  return (
    <div className="mx-auto flex min-h-[420px] max-w-2xl flex-col items-center justify-center rounded-lg border bg-card p-8 text-center shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-semibold">No pudimos cargar esta hoja de ruta</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Registramos el error para poder revisarlo. Podés reintentar o volver al listado de hojas de ruta.
      </p>
      {error.digest ? (
        <p className="mt-3 rounded bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
          Error: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/routes">
            <ArrowLeft className="h-4 w-4" />
            Volver a hojas de ruta
          </Link>
        </Button>
      </div>
    </div>
  )
}
