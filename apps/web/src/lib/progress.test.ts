import { describe, expect, it } from "vitest"

import { levelOf, streaks, titleIndex } from "@/lib/progress"

describe("levelOf", () => {
  it("starts at 1 and goes up every 250 XP", () => {
    expect(levelOf(0)).toBe(1)
    expect(levelOf(249)).toBe(1)
    expect(levelOf(250)).toBe(2)
    expect(levelOf(1000)).toBe(5)
  })
})

describe("titleIndex", () => {
  it("changes title at level 4 and 7", () => {
    expect([1, 3, 4, 6, 7, 20].map(titleIndex)).toEqual([0, 0, 1, 1, 2, 2])
  })
})

describe("streaks", () => {
  const on = "2026-11-24"
  it("counts today and the days before", () => {
    expect(streaks(["2026-11-22", "2026-11-23", "2026-11-24"], on)).toEqual({
      current: 3,
      best: 3,
    })
  })
  it("keeps yesterday's streak until today is over", () => {
    expect(streaks(["2026-11-22", "2026-11-23"], on).current).toBe(2)
  })
  it("is broken by a missed day", () => {
    expect(streaks(["2026-11-21", "2026-11-22"], on).current).toBe(0)
  })
  it("remembers the longest run", () => {
    const days = [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-24",
    ]
    expect(streaks(days, on)).toEqual({ current: 1, best: 4 })
  })
  it("is zero with nothing done", () => {
    expect(streaks([], on)).toEqual({ current: 0, best: 0 })
  })
})
