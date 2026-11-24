import { z } from "zod"

/**
 * Budget periods: a month ("2026-10"), a quarter ("2026-Q4") or a year ("2026").
 * The key is what goes in the URL.
 */

export const granularities = ["month", "quarter", "year"] as const
export type Granularity = (typeof granularities)[number]

export type Period = {
  granularity: Granularity
  year: number
  /** Month 1–12, quarter 1–4, or 1 for a year. */
  n: number
}

/** How many periods the trend chart shows. */
export const HISTORY_LENGTH: Record<Granularity, number> = {
  month: 12,
  quarter: 8,
  year: 5,
}

const PER_YEAR: Record<Granularity, number> = { month: 12, quarter: 4, year: 1 }
const MONTHS_PER: Record<Granularity, number> = {
  month: 1,
  quarter: 3,
  year: 12,
}

export function parsePeriod(key: string | undefined): Period | null {
  if (!key) return null
  let match = /^(\d{4})-(\d{2})$/.exec(key)
  if (match) {
    const n = Number(match[2])
    return n >= 1 && n <= 12
      ? { granularity: "month", year: Number(match[1]), n }
      : null
  }
  match = /^(\d{4})-Q([1-4])$/.exec(key)
  if (match) {
    return {
      granularity: "quarter",
      year: Number(match[1]),
      n: Number(match[2]),
    }
  }
  match = /^(\d{4})$/.exec(key)
  if (match) return { granularity: "year", year: Number(match[1]), n: 1 }
  return null
}

export function periodKey(p: Period): string {
  if (p.granularity === "month")
    return `${p.year}-${String(p.n).padStart(2, "0")}`
  if (p.granularity === "quarter") return `${p.year}-Q${p.n}`
  return String(p.year)
}

/** First month (1–12) the period covers. */
function startMonth(p: Period): number {
  return (p.n - 1) * MONTHS_PER[p.granularity] + 1
}

/** Half-open UTC date range [gte, lt) covering the period. */
export function periodRange(p: Period): { gte: Date; lt: Date } {
  const first = startMonth(p) - 1
  return {
    gte: new Date(Date.UTC(p.year, first, 1)),
    lt: new Date(Date.UTC(p.year, first + MONTHS_PER[p.granularity], 1)),
  }
}

/** Move a period forwards (positive) or backwards (negative). */
export function shiftPeriod(p: Period, by: number): Period {
  const per = PER_YEAR[p.granularity]
  const index = p.year * per + (p.n - 1) + by
  return {
    granularity: p.granularity,
    year: Math.floor(index / per),
    n: (((index % per) + per) % per) + 1,
  }
}

/** The period of another granularity that contains this one's first month. */
export function convertPeriod(p: Period, granularity: Granularity): Period {
  const month = startMonth(p)
  const n = Math.floor((month - 1) / MONTHS_PER[granularity]) + 1
  return { granularity, year: p.year, n }
}

/** "2026-10" (a month key) -> the containing period of the given granularity. */
export function periodOfMonth(month: string, granularity: Granularity): Period {
  const p = parsePeriod(month)
  if (!p || p.granularity !== "month") throw new Error(`Not a month: ${month}`)
  return convertPeriod(p, granularity)
}

/** The `count` periods ending with (and including) `p`, oldest first. */
export function periodsEndingWith(p: Period, count: number): Array<Period> {
  return Array.from({ length: count }, (_, i) => shiftPeriod(p, i - count + 1))
}

/** "October 2026", "Q4 2026", "2026" */
export function periodLabel(p: Period): string {
  if (p.granularity === "month") {
    return new Date(Date.UTC(p.year, p.n - 1, 1)).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  }
  if (p.granularity === "quarter") return `Q${p.n} ${p.year}`
  return String(p.year)
}

/** Compact label for chart axes: "Oct 26", "Q4 26", "2026" */
export function shortPeriodLabel(p: Period): string {
  const yy = String(p.year).slice(-2)
  if (p.granularity === "month") {
    const month = new Date(Date.UTC(p.year, p.n - 1, 1)).toLocaleDateString(
      "en-GB",
      { month: "short", timeZone: "UTC" }
    )
    return `${month} ${yy}`
  }
  if (p.granularity === "quarter") return `Q${p.n} ${yy}`
  return String(p.year)
}

/**
 * Relative change from `previous` to `current`, e.g. 0.12 for +12%.
 * `null` when there is nothing to compare against.
 */
export function relativeChange(
  current: number,
  previous: number | null | undefined
): number | null {
  if (previous === null || previous === undefined || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

/** `part` as a share of `whole` (0.25 = 25%), or null when `whole` is 0. */
export function share(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole
}

/**
 * Search-param schema for a period key. The router parses `?period=2026` as a
 * number, so accept both and normalise to a string. Unknown values are
 * dropped, which falls back to the newest month.
 */
export const periodSearchParam = z
  .union([z.string(), z.number()])
  .transform((value) =>
    parsePeriod(String(value)) ? String(value) : undefined
  )
  .optional()
  .catch(undefined)
