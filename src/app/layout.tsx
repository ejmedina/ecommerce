import "./globals.css"
import type { Metadata } from "next"
import { db } from "@/lib/db"

export async function generateMetadata() {
  const settings = await db.storeSettings.findFirst()
  
  return {
    title: settings?.storeName || process.env.NEXT_PUBLIC_APP_NAME || "Mi Tienda",
    description: "Tu tienda online de confianza",
    icons: settings?.favicon 
      ? { icon: settings.favicon }
      : undefined,
  } as Metadata
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
