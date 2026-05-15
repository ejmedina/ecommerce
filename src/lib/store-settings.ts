import { cache } from "react"
import { db } from "@/lib/db"
import { DEFAULT_STORE_TIME_ZONE, normalizeTimeZone } from "@/lib/time-zone"

export const getStoreTimeZone = cache(async () => {
  const settings = await db.storeSettings.findFirst({
    select: { timeZone: true },
  })

  return normalizeTimeZone(settings?.timeZone ?? DEFAULT_STORE_TIME_ZONE)
})
