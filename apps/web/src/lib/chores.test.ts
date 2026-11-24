import { describe, expect, it } from "vitest"

import {
  daysLeft,
  formatDay,
  formatWeek,
  penaltiesFor,
  penaltyFor,
  toLocalDate,
  weekNumber,
  weekStart,
} from "./chores"

describe("weeks", () => {
  it("start on the Monday on or before the date", () => {
    expect(weekStart("2026-11-18")).toBe("2026-11-16") // Wednesday
    expect(weekStart("2026-11-16")).toBe("2026-11-16") // Monday
    expect(weekStart("2026-11-22")).toBe("2026-11-16") // Sunday
  })

  it("are numbered and named", () => {
    expect(weekNumber("2026-11-16")).toBe(47)
    expect(weekNumber("2026-12-28")).toBe(53)
    expect(weekNumber("2027-01-04")).toBe(1)
    expect(formatWeek("2026-11-16")).toBe("16.–22. nov.")
    expect(formatWeek("2026-11-30")).toBe("30. nov. – 6. dec.")
  })

  it("name days", () => {
    expect(formatDay("2026-11-19", "2026-11-19")).toBe("I dag")
    expect(formatDay("2026-11-18", "2026-11-19")).toBe("I går")
    expect(formatDay("2026-11-16", "2026-11-19")).toBe("Man. 16. nov.")
  })

  it("count the days left, today included", () => {
    expect(daysLeft("2026-11-16", "2026-11-16")).toBe(7)
    expect(daysLeft("2026-11-16", "2026-11-22")).toBe(1)
  })

  it("use the household's time zone", () => {
    // 23:30 UTC on the 16th is already the 17th in Copenhagen.
    expect(toLocalDate(new Date("2026-11-16T23:30:00Z"))).toBe("2026-11-17")
  })
})

describe("penalties", () => {
  it("cost 10% of the purse, rounded up", () => {
    expect(penaltyFor(200)).toBe(20)
    expect(penaltyFor(15)).toBe(2)
    expect(penaltyFor(3)).toBe(1)
    expect(penaltyFor(0)).toBe(0)
  })

  it("are charged one undone chore after another", () => {
    expect(penaltiesFor(210, 2)).toEqual([21, 19])
    expect(penaltiesFor(100, 3)).toEqual([10, 9, 9])
    expect(penaltiesFor(1, 3)).toEqual([1])
    expect(penaltiesFor(0, 2)).toEqual([])
    expect(penaltiesFor(50, 0)).toEqual([])
  })
})
