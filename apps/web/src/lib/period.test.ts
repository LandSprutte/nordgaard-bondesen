import { describe, expect, it } from "vitest"

import {
  convertPeriod,
  parsePeriod,
  periodKey,
  periodLabel,
  periodRange,
  periodsEndingWith,
  relativeChange,
  shiftPeriod,
} from "./period"

const p = (key: string) => {
  const period = parsePeriod(key)
  if (!period) throw new Error(`bad key ${key}`)
  return period
}

describe("parsePeriod / periodKey", () => {
  it.each(["2026-10", "2026-01", "2026-Q4", "2026-Q1", "2026"])(
    "round-trips %s",
    (key) => expect(periodKey(p(key))).toBe(key)
  )

  it.each(["2026-13", "2026-00", "2026-Q5", "26", "", "October"])(
    "rejects %s",
    (key) => expect(parsePeriod(key)).toBeNull()
  )
})

describe("periodRange", () => {
  it("covers a month", () => {
    expect(periodRange(p("2026-12"))).toEqual({
      gte: new Date("2026-12-01T00:00:00Z"),
      lt: new Date("2027-01-01T00:00:00Z"),
    })
  })

  it("covers a quarter", () => {
    expect(periodRange(p("2026-Q4"))).toEqual({
      gte: new Date("2026-10-01T00:00:00Z"),
      lt: new Date("2027-01-01T00:00:00Z"),
    })
  })

  it("covers a year", () => {
    expect(periodRange(p("2026"))).toEqual({
      gte: new Date("2026-01-01T00:00:00Z"),
      lt: new Date("2027-01-01T00:00:00Z"),
    })
  })
})

describe("shiftPeriod", () => {
  it.each([
    ["2026-01", -1, "2025-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-10", -12, "2025-10"],
    ["2026-Q1", -1, "2025-Q4"],
    ["2026-Q4", 1, "2027-Q1"],
    ["2026", -1, "2025"],
  ])("%s shifted by %i is %s", (key, by, expected) => {
    expect(periodKey(shiftPeriod(p(key), by))).toBe(expected)
  })
})

describe("convertPeriod", () => {
  it.each([
    ["2026-10", "quarter", "2026-Q4"],
    ["2026-03", "quarter", "2026-Q1"],
    ["2026-10", "year", "2026"],
    ["2026-Q3", "month", "2026-07"],
    ["2026", "month", "2026-01"],
  ] as const)("%s as %s is %s", (key, granularity, expected) => {
    expect(periodKey(convertPeriod(p(key), granularity))).toBe(expected)
  })
})

describe("periodsEndingWith", () => {
  it("returns oldest first, ending with the period itself", () => {
    expect(periodsEndingWith(p("2026-02"), 3).map(periodKey)).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
    ])
  })
})

describe("periodLabel", () => {
  it("names each granularity", () => {
    expect(periodLabel(p("2026-10"))).toBe("October 2026")
    expect(periodLabel(p("2026-Q4"))).toBe("Q4 2026")
    expect(periodLabel(p("2026"))).toBe("2026")
  })
})

describe("relativeChange", () => {
  it("is relative to the size of the previous value", () => {
    expect(relativeChange(120, 100)).toBeCloseTo(0.2)
    expect(relativeChange(80, 100)).toBeCloseTo(-0.2)
    // A negative previous value that improves is an increase.
    expect(relativeChange(-50, -100)).toBeCloseTo(0.5)
  })

  it("is null without a previous value", () => {
    expect(relativeChange(100, 0)).toBeNull()
    expect(relativeChange(100, null)).toBeNull()
  })
})
