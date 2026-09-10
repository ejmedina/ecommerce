export interface DeliveryScheduleRuleInput {
  id: string
  shippingZoneId: string
  weekday: number
  startTime: string
  endTime: string
  cutoffDaysBefore: number
  cutoffTime: string
  isActive: boolean
}

export interface DeliveryOption {
  key: string
  ruleId: string
  date: string // YYYY-MM-DD in the store's local calendar
  startTime: string
  endTime: string
  label: string
}

function localParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const part = (type: string) => Number(values.find((value) => value.type === type)?.value)
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") }
}

function parseTime(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return { hour, minute }
}

function dateFromUtcDay(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`
}

function localDateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`))
}

/** Returns every active slot in the next eligible delivery dates for one zone. */
export function getDeliveryOptions({
  rules,
  shippingZoneId,
  timeZone,
  limit,
  now = new Date(),
}: {
  rules: DeliveryScheduleRuleInput[]
  shippingZoneId: string
  timeZone: string
  limit: number
  now?: Date
}): DeliveryOption[] {
  const localNow = localParts(now, timeZone)
  const nowCivil = Date.UTC(localNow.year, localNow.month - 1, localNow.day, localNow.hour, localNow.minute)
  const start = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day))
  const applicableRules = rules.filter((rule) => rule.isActive && rule.shippingZoneId === shippingZoneId)
  const options: DeliveryOption[] = []
  let includedDates = 0

  for (let offset = 0; offset < 366 && includedDates < Math.max(1, limit); offset += 1) {
    const candidate = new Date(start)
    candidate.setUTCDate(start.getUTCDate() + offset)
    const matchingRules = applicableRules.filter((rule) => rule.weekday === candidate.getUTCDay())
    if (matchingRules.length === 0) continue

    const eligibleRules = matchingRules.filter((rule) => {
      const cutoffDate = new Date(candidate)
      cutoffDate.setUTCDate(candidate.getUTCDate() - rule.cutoffDaysBefore)
      const cutoff = parseTime(rule.cutoffTime)
      const cutoffCivil = Date.UTC(
        cutoffDate.getUTCFullYear(),
        cutoffDate.getUTCMonth(),
        cutoffDate.getUTCDate(),
        cutoff.hour,
        cutoff.minute,
      )
      return nowCivil <= cutoffCivil
    })
    if (eligibleRules.length === 0) continue

    const date = dateFromUtcDay(candidate)
    for (const rule of eligibleRules.sort((left, right) => left.startTime.localeCompare(right.startTime))) {
      options.push({
        key: `${rule.id}:${date}`,
        ruleId: rule.id,
        date,
        startTime: rule.startTime,
        endTime: rule.endTime,
        label: `${localDateLabel(date)} · ${rule.startTime} a ${rule.endTime}`,
      })
    }
    includedDates += 1
  }

  return options
}
