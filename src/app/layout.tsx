import "./globals.css"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { Toaster } from "@/components/toaster-client"
import { ThemeProvider, ThemeColors } from "@/components/theme-provider"

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await db.storeSettings.findFirst()
  
  // Parse theme colors from settings
  let themeColors: ThemeColors | null = null
  if (settings?.themeColors) {
    try {
      themeColors = typeof settings.themeColors === 'string' 
        ? JSON.parse(settings.themeColors) 
        : settings.themeColors
    } catch (e) {
      console.error("Error parsing theme colors:", e)
    }
  }
  
  return (
    <html lang="es">
      <body>
        <ThemeProvider colors={themeColors}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
