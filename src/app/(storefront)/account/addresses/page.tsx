import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AddressList } from "@/components/address-list"
import { getDefaultShippingConfig, type ShippingConfig } from "@/lib/shipping"

export default async function AddressesPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const [addresses, settings] = await Promise.all([
    db.address.findMany({
      where: { userId: session.user.id },
      orderBy: { isDefault: "desc" },
    }),
    db.storeSettings.findFirst({ select: { shippingConfig: true } }),
  ])
  const shippingConfig = (settings?.shippingConfig as ShippingConfig | null) || getDefaultShippingConfig()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis direcciones</h1>
      <AddressList addresses={addresses} shippingConfig={shippingConfig} />
    </div>
  )
}
