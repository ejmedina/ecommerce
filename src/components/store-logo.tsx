"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface StoreSettings {
  logo: string | null
  logoWidth: number | null
  logoHeight: number | null
  storeName: string
}

export function StoreLogo() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error)
  }, [])

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
