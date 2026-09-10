import { describe, expect, it } from "vitest"
import { getDeliveryOptions, type DeliveryScheduleRuleInput } from "./delivery-scheduling"

const thursdayRule: DeliveryScheduleRuleInput = {
  id: "thursday-am",
  shippingZoneId: "elpan-zone",
  weekday: 4,
  startTime: "09:00",
  endTime: "16:00",
  cutoffDaysBefore: 2,
  cutoffTime: "13:00",
  isActive: true,
}

describe("delivery scheduling", () => {
  it("offers the current and next Thursday before Tuesday's cutoff", () => {
    const options = getDeliveryOptions({
      rules: [thursdayRule],
      shippingZoneId: "elpan-zone",
      timeZone: "America/Argentina/Buenos_Aires",
      limit: 2,
      // Tuesday 1 September 2026, 10:00 in Buenos Aires.
      now: new Date("2026-09-01T13:00:00Z"),
    })

    expect(options.map((option) => option.date)).toEqual(["2026-09-03", "2026-09-10"])
  })

  it("skips the current Thursday after Tuesday's cutoff", () => {
    const options = getDeliveryOptions({
      rules: [thursdayRule],
      shippingZoneId: "elpan-zone",
      timeZone: "America/Argentina/Buenos_Aires",
      limit: 2,
      // Tuesday 1 September 2026, 14:00 in Buenos Aires.
      now: new Date("2026-09-01T17:00:00Z"),
    })

    expect(options.map((option) => option.date)).toEqual(["2026-09-10", "2026-09-17"])
  })

  it("does not expose rules from another shipping zone", () => {
    expect(getDeliveryOptions({
      rules: [thursdayRule],
      shippingZoneId: "other-zone",
      timeZone: "America/Argentina/Buenos_Aires",
      limit: 2,
      now: new Date("2026-09-01T13:00:00Z"),
    })).toEqual([])
  })
})
