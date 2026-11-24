/**
 * Chore weeks. Dates are plain "YYYY-MM-DD" strings in the household's time
 * zone, so a week starts on the same Monday on server and client.
 */

export const TIME_ZONE = "Europe/Copenhagen"

/** Today's date ("YYYY-MM-DD") in the household's time zone. */
export function today(now: Date = new Date()): string {
  return toLocalDate(now)
}

/** A timestamp as a "YYYY-MM-DD" date in the household's time zone. */
export function toLocalDate(instant: Date): string {
  // en-CA formats dates as YYYY-MM-DD.
  return instant.toLocaleDateString("en-CA", { timeZone: TIME_ZONE })
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function addDays(date: string, days: number): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function isoWeekday(d: Date): number {
  return d.getUTCDay() === 0 ? 7 : d.getUTCDay()
}

/** The Monday on or before `date`: the week it belongs to. */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(parse(date)))
}

/** ISO week number, e.g. 47. */
export function weekNumber(monday: string): number {
  const thursday = parse(addDays(monday, 3))
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - jan1) / 86_400_000 / 7) + 1
}

const MONTHS = [
  "jan.",
  "feb.",
  "mar.",
  "apr.",
  "maj",
  "jun.",
  "jul.",
  "aug.",
  "sep.",
  "okt.",
  "nov.",
  "dec.",
]
const WEEKDAYS = ["man.", "tir.", "ons.", "tor.", "fre.", "lør.", "søn."]

function dayMonth(date: string): { day: number; month: string } {
  const d = parse(date)
  return { day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] }
}

/** "16.–22. nov.", or "30. nov. – 6. dec." across months. */
export function formatWeek(monday: string): string {
  const start = dayMonth(monday)
  const end = dayMonth(addDays(monday, 6))
  return start.month === end.month
    ? `${start.day}.–${end.day}. ${end.month}`
    : `${start.day}. ${start.month} – ${end.day}. ${end.month}`
}

/** Days left in the week, today included: 7 on Monday, 1 on Sunday. */
export function daysLeft(monday: string, on: string): number {
  return (
    7 - Math.round((parse(on).getTime() - parse(monday).getTime()) / 86_400_000)
  )
}

/** Share of the purse an undone chore costs. */
export const PENALTY_RATE = 0.1

/** What one undone chore costs: 10% of the balance, at least 1 if there's any. */
export function penaltyFor(balance: number): number {
  return balance > 0 ? Math.ceil(balance * PENALTY_RATE) : 0
}

/**
 * Charges for a member with `balance` when `undone` chores were left: one
 * per chore, each on what's left after the one before. Zero charges are
 * left out.
 */
export function penaltiesFor(balance: number, undone: number): Array<number> {
  const charges: Array<number> = []
  for (let i = 0; i < undone; i++) {
    const charge = penaltyFor(balance)
    if (charge === 0) break
    charges.push(charge)
    balance -= charge
  }
  return charges
}

/** A "YYYY-MM-DD" date as the Date Prisma stores in a `@db.Date` column. */
export function toDbDate(date: string): Date {
  return parse(date)
}

/** A `@db.Date` column (UTC midnight) as "YYYY-MM-DD". */
export function dateOf(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Colours members can pick; mid-tones that read on light and dark. */
export const MEMBER_COLORS = [
  "#e11d48",
  "#f97316",
  "#eab308",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
] as const

export const MEMBER_EMOJIS = [
  "🦜",
  "🐙",
  "🦈",
  "🐢",
  "🦀",
  "🐳",
  "🏴‍☠️",
  "⚓",
  "🧭",
  "🦑",
  "🐬",
  "🌊",
] as const

/** "I dag", "I går" or "Man. 16. nov.". */
export function formatDay(date: string, on: string): string {
  if (date === on) return "I dag"
  if (date === addDays(on, -1)) return "I går"
  const { day, month } = dayMonth(date)
  const weekday = WEEKDAYS[isoWeekday(parse(date)) - 1]
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}. ${month}`
}
