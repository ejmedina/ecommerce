import Link from "next/link"
import { db } from "@/lib/db"

export async function StoreLogo() {
  const settings = await db.storeSettings.findFirst({
    select: {
      logo: true,
      logoWidth: true,
      logoHeight: true,
      storeName: true
    }
  })

  const storeName = settings?.storeName || process.env.NEXT_PUBLIC_APP_NAME || "Mi Tienda"

  if (settings?.logo) {
    return (
      <Link href="/" className="flex items-center">
        <img
          src={settings.logo}
          alt={storeName}
          style={{
            height: settings.logoHeight ? `${settings.logoHeight}px` : "40px",
            width: "auto",
            maxWidth: settings.logoWidth ? `${settings.logoWidth}px` : "200px",
          }}
        />
      </Link>
    )
  }

  return (
    <Link href="/" className="text-xl font-bold">
      {storeName}
    </Link>
  )
}
