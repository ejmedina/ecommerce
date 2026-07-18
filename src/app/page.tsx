import { redirect } from "next/navigation"
import { InstitutionalHome } from "@/components/institutional/home"
import { getInstitutionalHomeFlavor } from "@/lib/home-flavor"
import { getHomeMode } from "@/lib/home-mode"
import { db } from "@/lib/db"

export default async function Home() {
  if (getHomeMode() === "storefront") {
    redirect("/home")
  }

  const flavor = getInstitutionalHomeFlavor()

  if (!flavor) {
    redirect("/home")
  }

  const settings = await db.storeSettings.findFirst()
  const articles = settings?.blogEnabled 
    ? await db.article.findMany({
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      })
    : []

  return (
    <InstitutionalHome 
      flavor={flavor} 
      settings={settings}
      articles={articles}
    />
  )
}
// force rebuild for new DB settings
