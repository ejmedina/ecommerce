import "./globals.css"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { Toaster } from "@/components/toaster-client"
import { ThemeProvider, ThemeColors } from "@/components/theme-provider"

async function getStoreSettings() {
  try {
    return await db.storeSettings.findFirst()
  } catch (error) {
    console.error("Failed to load store settings:", error)
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  const title = settings?.storeName || process.env.NEXT_PUBLIC_APP_NAME || "Mi Tienda"
  const description = "Tu tienda online de confianza"
  
  // Resolve logo URL
  const logoUrl = settings?.logo ? settings.logo : "/pgi/pgi-perfil-ig.jpg" // Use store profile pic as fallback

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    icons: settings?.favicon 
      ? { icon: settings.favicon }
      : undefined,
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: title,
      locale: 'es_AR',
      type: 'website',
      images: [
        {
          url: logoUrl,
          width: 800,
          height: 600,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [logoUrl],
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getStoreSettings()
  
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
