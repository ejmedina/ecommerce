import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Mi Tienda",
  description: "Tu tienda online de confianza",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
