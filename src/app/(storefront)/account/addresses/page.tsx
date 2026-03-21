import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AddressList } from "@/components/address-list"

export default async function AddressesPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis direcciones</h1>
      <AddressList addresses={addresses} />
    </div>
  )
}
