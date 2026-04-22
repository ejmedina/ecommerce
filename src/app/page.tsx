import { redirect } from "next/navigation"
import { InstitutionalHome } from "@/components/institutional/home"
import { getInstitutionalHomeFlavor } from "@/lib/home-flavor"
import { getHomeMode } from "@/lib/home-mode"

export default function Home() {
  if (getHomeMode() === "storefront") {
    redirect("/home")
  }

  const flavor = getInstitutionalHomeFlavor()

  if (!flavor) {
    redirect("/home")
  }

  return <InstitutionalHome flavor={flavor} />
}
