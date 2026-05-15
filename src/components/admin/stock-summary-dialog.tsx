"use client"

import { useMemo, useState } from "react"
import { Clipboard, Loader2, Printer } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export interface StockSummaryItemInput {
  productId: string
  name: string
  quantityOrdered: number
  quantityFulfilled?: number | null
  quantityMissing?: number | null
}

interface StockSummaryDialogProps {
  triggerLabel: string
  disabled?: boolean
  title?: string
  selectionLabel: string
  items: StockSummaryItemInput[]
  timeZone?: string | null
}

type StockSummaryRow = {
  productId: string
  name: string
  totalOrdered: number
  totalCurrent: number
}

function calculateStockSummary(items: StockSummaryItemInput[]): StockSummaryRow[] {
  const stockMap = new Map<string, StockSummaryRow>()

  for (const item of items) {
    const existing = stockMap.get(item.productId)
    const fulfilledQuantity = item.quantityFulfilled ?? item.quantityOrdered
    const missingQuantity = item.quantityMissing ?? Math.max(item.quantityOrdered - fulfilledQuantity, 0)
    const currentQuantity = Math.max(item.quantityOrdered - missingQuantity, 0)

    if (existing) {
      existing.totalOrdered += item.quantityOrdered
      existing.totalCurrent += currentQuantity
      continue
    }

    stockMap.set(item.productId, {
      productId: item.productId,
      name: item.name,
      totalOrdered: item.quantityOrdered,
      totalCurrent: currentQuantity,
    })
  }

  return Array.from(stockMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function buildStockSummaryText(rows: StockSummaryRow[]) {
  return rows
    .map((item) => `${item.name}: total ${item.totalOrdered} / actual ${item.totalCurrent}`)
    .join("\n")
}

function buildStockSummaryHtml(
  rows: StockSummaryRow[],
  title: string,
  selectionLabel: string,
  timeZone?: string | null
) {
  const generatedAt = new Date()
  const stockHtml = rows
    .map((item) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; text-align: left;">${item.name}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">${item.totalOrdered}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">${item.totalCurrent}</td>
      </tr>
    `)
    .join("")

  return `
    <html>
      <head>
        <title>${title} - ${formatDate(generatedAt, undefined, timeZone)}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          h1 { font-size: 20px; color: #333; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Fecha: ${formatDateTime(generatedAt, timeZone)}</p>
        <p>${selectionLabel}</p>
        <table>
          <thead>
            <tr style="background-color: #f9f9f9;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total pedido</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">A entregar</th>
            </tr>
          </thead>
          <tbody>
            ${stockHtml}
          </tbody>
        </table>
        <div class="footer">
          Generado automáticamente el ${formatDateTime(generatedAt, timeZone)}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
    </html>
  `
}

export function StockSummaryDialog({
  triggerLabel,
  disabled,
  title = "Stock estimado",
  selectionLabel,
  items,
  timeZone,
}: StockSummaryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const rows = useMemo(() => calculateStockSummary(items), [items])

  const copyToClipboard = async () => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(buildStockSummaryText(rows))
    } finally {
      setIsCopying(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(buildStockSummaryHtml(rows, title, selectionLabel, timeZone))
    printWindow.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-full whitespace-nowrap px-3 sm:w-auto">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{selectionLabel}</p>
          <div className="max-h-80 overflow-y-auto rounded-lg bg-muted/50">
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No hay productos</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 text-right font-medium">Total pedido</th>
                    <th className="px-4 py-3 text-right font-medium">A entregar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.productId} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-right">{item.totalOrdered}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={item.totalCurrent < item.totalOrdered ? "text-orange-600 font-medium" : ""}>
                          {item.totalCurrent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handlePrint} disabled={rows.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={copyToClipboard} disabled={rows.length === 0 || isCopying}>
            {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clipboard className="mr-2 h-4 w-4" />}
            Copiar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
