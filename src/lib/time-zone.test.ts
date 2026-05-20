import { describe, expect, it } from "vitest"
import {
  getDateInputValueInTimeZone,
  getDatePartsInTimeZone,
  getDateRangeForDateInput,
  getMonthRangeForTimeZone,
  normalizeTimeZone,
} from "./time-zone"

describe("time-zone helpers", () => {
  it("normalizes invalid time zones to the store default", () => {
    expect(normalizeTimeZone("Mars/Olympus")).toBe("America/Argentina/Buenos_Aires")
  })

  it("returns date parts in the configured store time zone", () => {
    const parts = getDatePartsInTimeZone(
      "2026-05-15T01:50:47.327Z",
      "America/Argentina/Buenos_Aires"
    )

    expect(parts.year).toBe(2026)
    expect(parts.month).toBe(5)
    expect(parts.day).toBe(14)
    expect(parts.hour).toBe(22)
    expect(parts.minute).toBe(50)
  })

  it("builds a local date input value from a UTC timestamp", () => {
    expect(
      getDateInputValueInTimeZone(
        "2026-05-15T01:50:47.327Z",
        "America/Argentina/Buenos_Aires"
      )
    ).toBe("2026-05-14")
  })

  it("converts a local store day into an exact UTC range", () => {
    const { start, endExclusive } = getDateRangeForDateInput(
      "2026-05-14",
      "America/Argentina/Buenos_Aires"
    )

    expect(start.toISOString()).toBe("2026-05-14T03:00:00.000Z")
    expect(endExclusive.toISOString()).toBe("2026-05-15T03:00:00.000Z")
  })

  it("converts a local store month into an exact UTC range", () => {
    const { start, endExclusive } = getMonthRangeForTimeZone(
      "2026-05-15T01:50:47.327Z",
      "America/Argentina/Buenos_Aires"
    )

    expect(start.toISOString()).toBe("2026-05-01T03:00:00.000Z")
    expect(endExclusive.toISOString()).toBe("2026-06-01T03:00:00.000Z")
  })
})
