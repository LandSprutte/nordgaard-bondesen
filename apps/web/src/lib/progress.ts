import { addDays } from "@/lib/chores"

/** Experience needed per member level. */
export const MEMBER_LEVEL_XP = 250

export const levelOf = (xp: number) => Math.floor(xp / MEMBER_LEVEL_XP) + 1

/** Which of a world's three level titles a level has: LV 1–3, 4–6, 7+. */
export const titleIndex = (level: number) =>
  level >= 7 ? 2 : level >= 4 ? 1 : 0

/** The level each title starts at. */
export const TITLE_LEVELS = [1, 4, 7] as const

/**
 * Days in a row with something done. `current` counts back from `on`, or
 * from the day before when nothing is done yet on `on`, so a streak isn't
 * lost before the day is over.
 */
export function streaks(dates: Iterable<string>, on: string) {
  const days = new Set(dates)
  let current = 0
  let day = days.has(on) ? on : addDays(on, -1)
  while (days.has(day)) {
    current++
    day = addDays(day, -1)
  }
  let best = 0
  for (const start of days) {
    // Only count from the first day of a run.
    if (days.has(addDays(start, -1))) continue
    let length = 0
    while (days.has(addDays(start, length))) length++
    best = Math.max(best, length)
  }
  return { current, best }
}
