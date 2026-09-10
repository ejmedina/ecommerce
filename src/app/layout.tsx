import "./globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NavigationFeedbackProvider } from "@/components/navigation-feedback"
import { Toaster } from "@/components/toaster-client"
import { ThemeProvider, ThemeColors } from "@/components/theme-provider"
import { WhatsappWidget } from "@/components/whatsapp-widget"

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
  const [settings, session] = await Promise.all([getStoreSettings(), auth()])
  const gtmId = settings?.gtmContainerId?.match(/^GTM-[A-Z0-9]+$/) ? settings.gtmContainerId : undefined
  const gaMeasurementId = settings?.gaMeasurementId?.match(/^G-[A-Z0-9]+$/) ? settings.gaMeasurementId : undefined
  const metaPixelId = settings?.metaPixelId?.match(/^\d+$/) ? settings.metaPixelId : undefined
  const shouldHideWhatsappForUser =
    session?.user?.role !== undefined &&
    ["SUPERADMIN", "OWNER", "ADMIN"].includes(session.user.role)
  
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
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      {!gtmId && gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
      {metaPixelId ? (
        <Script id="meta-pixel-init" strategy="beforeInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}
      <body>
        <NavigationFeedbackProvider>
          <ThemeProvider colors={themeColors}>
            {children}
            <WhatsappWidget
              enabled={(settings?.whatsappWidgetEnabled ?? false) && !shouldHideWhatsappForUser}
              phone={settings?.whatsappWidgetPhone ?? null}
              message={settings?.whatsappWidgetMessage ?? null}
            />
            <Toaster />
            {metaPixelId ? (
              <noscript>
                <img
                  alt=""
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                />
              </noscript>
            ) : null}
          </ThemeProvider>
        </NavigationFeedbackProvider>
      </body>
    </html>
  )
}
