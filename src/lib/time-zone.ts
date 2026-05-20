export const DEFAULT_STORE_TIME_ZONE = "America/Argentina/Buenos_Aires"

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getDateTimeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
}

function getOffsetForTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone)
  const utcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return utcMs - date.getTime()
}

function shiftLocalDate(year: number, month: number, day: number, dayDelta: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + dayDelta))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

export function normalizeTimeZone(timeZone?: string | null) {
  const candidate = timeZone?.trim() || DEFAULT_STORE_TIME_ZONE

  try {
    new Intl.DateTimeFormat("es-AR", { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return DEFAULT_STORE_TIME_ZONE
  }
}

export function getDatePartsInTimeZone(
  date: Date | string,
  timeZone?: string | null
): DateParts {
  const safeTimeZone = normalizeTimeZone(timeZone)
  const value = typeof date === "string" ? new Date(date) : date
  const parts = getDateTimeFormatter(safeTimeZone).formatToParts(value)

  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

export function zonedDateTimeToUtc(
  value: {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
  },
  timeZone?: string | null
) {
  const safeTimeZone = normalizeTimeZone(timeZone)
  const desired = {
    hour: 0,
    minute: 0,
    second: 0,
    ...value,
  }

  let utcMs = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second
  )

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = getOffsetForTimeZone(new Date(utcMs), safeTimeZone)
    const nextUtcMs =
      Date.UTC(
        desired.year,
        desired.month - 1,
        desired.day,
        desired.hour,
        desired.minute,
        desired.second
      ) - offset

    if (nextUtcMs === utcMs) break
    utcMs = nextUtcMs
  }

  return new Date(utcMs)
}

export function getDateInputValueInTimeZone(
  date: Date | string,
  timeZone?: string | null
) {
  const parts = getDatePartsInTimeZone(date, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

export function getDateRangeForDateInput(
  dateInput: string,
  timeZone?: string | null
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput)
  if (!match) {
    throw new Error(`Invalid date input: ${dateInput}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const start = zonedDateTimeToUtc({ year, month, day }, timeZone)
  const nextDay = shiftLocalDate(year, month, day, 1)
  const endExclusive = zonedDateTimeToUtc(nextDay, timeZone)

  return { start, endExclusive }
}

export function getMonthRangeForTimeZone(
  referenceDate: Date | string,
  timeZone?: string | null
) {
  const parts = getDatePartsInTimeZone(referenceDate, timeZone)
  const start = zonedDateTimeToUtc(
    { year: parts.year, month: parts.month, day: 1 },
    timeZone
  )

  const nextMonth =
    parts.month === 12
      ? { year: parts.year + 1, month: 1 }
      : { year: parts.year, month: parts.month + 1 }

  const endExclusive = zonedDateTimeToUtc(
    { year: nextMonth.year, month: nextMonth.month, day: 1 },
    timeZone
  )

  return { start, endExclusive }
}
