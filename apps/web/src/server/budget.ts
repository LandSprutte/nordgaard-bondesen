import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { importBankCsv, prisma } from "@workspace/db"
import { BankCsvError } from "@workspace/db/csv"

import {
  HISTORY_LENGTH,
  granularities,
  parsePeriod,
  periodKey,
  periodLabel,
  periodOfMonth,
  periodRange,
  periodsEndingWith,
  shiftPeriod,
  shortPeriodLabel,
} from "@/lib/period"
import type { Granularity, Period } from "@/lib/period"
import { UNCATEGORISED, UNGROUPED } from "@/lib/budget"
import { buildSpendingTree } from "@/lib/spending"

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const periodSchema = z
  .string()
  .refine(
    (key) => parsePeriod(key) !== null,
    "Expected 2026-10, 2026-Q4 or 2026"
  )
  .optional()

/** All months that have transactions, newest first ("2026-10"). */
async function availableMonths(): Promise<Array<string>> {
  const rows = await prisma.$queryRaw<Array<{ month: string }>>`
    SELECT DISTINCT to_char(date, 'YYYY-MM') AS month
    FROM "Transaction"
    ORDER BY month DESC`
  return rows.map((row) => row.month)
}

/** The requested period, or the newest month with data. */
function resolvePeriod(
  requested: string | undefined,
  months: Array<string>
): Period {
  const fallback = months[0] ?? new Date().toISOString().slice(0, 7)
  const period = parsePeriod(requested) ?? parsePeriod(fallback)
  if (!period) throw new Error(`Invalid period "${fallback}"`)
  return period
}

/** Periods of one granularity that have data, newest first, for pickers. */
function periodOptions(months: Array<string>, granularity: Granularity) {
  const keys = new Set(
    months.map((m) => periodKey(periodOfMonth(m, granularity)))
  )
  return [...keys].map((key) => ({
    key,
    label: periodLabel(parsePeriod(key) as Period),
  }))
}

function availablePeriods(months: Array<string>) {
  return Object.fromEntries(
    granularities.map((g) => [g, periodOptions(months, g)])
  ) as Record<Granularity, Array<{ key: string; label: string }>>
}

type Row = {
  date: Date
  accountNumber: string
  amount: number
  isTransfer: boolean
  category: string | null
}

type Totals = {
  income: number
  expenses: number
  net: number
  transfers: number
}

function totalsOf(rows: Array<Row>): Totals {
  let income = 0
  let expenses = 0
  let transfers = 0
  for (const row of rows) {
    if (row.isTransfer) {
      // Count the sending side only, so a transfer isn't counted twice.
      if (row.amount < 0) transfers += -row.amount
    } else if (row.amount >= 0) income += row.amount
    else expenses += -row.amount
  }
  return { income, expenses, net: income - expenses, transfers }
}

/** Income and expenses per name, e.g. per category or per category group. */
function breakdown(rows: Array<Row>, nameOf: (row: Row) => string) {
  const result = new Map<string, { income: number; expenses: number }>()
  for (const row of rows) {
    if (row.isTransfer) continue
    const name = nameOf(row)
    const sums = result.get(name) ?? { income: 0, expenses: 0 }
    if (row.amount >= 0) sums.income += row.amount
    else sums.expenses += -row.amount
    result.set(name, sums)
  }
  return result
}

/** Rows for a breakdown table, compared with the previous period. */
function compareBreakdowns(
  current: ReturnType<typeof breakdown>,
  previous: ReturnType<typeof breakdown> | null
) {
  return [...current]
    .map(([name, sums]) => {
      const prev = previous?.get(name)
      return {
        name,
        ...sums,
        previousIncome: previous ? (prev?.income ?? 0) : null,
        previousExpenses: previous ? (prev?.expenses ?? 0) : null,
      }
    })
    .sort((a, b) => b.expenses - a.expenses || b.income - a.income)
}

function inRange(row: Row, range: { gte: Date; lt: Date }) {
  return row.date >= range.gte && row.date < range.lt
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export const getBudgetSummary = createServerFn({ method: "GET" })
  .validator(z.object({ period: periodSchema }))
  .handler(async ({ data }) => {
    const months = await availableMonths()
    const period = resolvePeriod(data.period, months)
    const previous = shiftPeriod(period, -1)
    const current = periodRange(period)
    const before = periodRange(previous)
    const history = periodsEndingWith(
      period,
      HISTORY_LENGTH[period.granularity]
    )
    const historyStart = periodRange(history[0]).gte

    const [accounts, transactions, unmappedKeys, firstDates, categorySettings] =
      await Promise.all([
        prisma.account.findMany({ orderBy: { number: "asc" } }),
        prisma.transaction.findMany({
          where: { date: { gte: historyStart, lt: current.lt } },
          select: {
            date: true,
            accountNumber: true,
            amount: true,
            textKey: { select: { isTransfer: true, category: true } },
          },
        }),
        prisma.textKey.count({ where: { label: null, isTransfer: false } }),
        prisma.transaction.groupBy({
          by: ["accountNumber"],
          _min: { date: true },
        }),
        prisma.category.findMany({ where: { group: { not: null } } }),
      ])

    const rows: Array<Row> = transactions.map((t) => ({
      date: t.date,
      accountNumber: t.accountNumber,
      amount: t.amount.toNumber(),
      isTransfer: t.textKey.isTransfer,
      category: t.textKey.category,
    }))
    const currentRows = rows.filter((r) => inRange(r, current))
    const previousRows = rows.filter((r) => inRange(r, before))
    const hasPrevious = previousRows.length > 0

    // Balance at a point in time = latest balance minus everything after it.
    const afterCurrent = await prisma.transaction.groupBy({
      by: ["accountNumber"],
      where: { date: { gte: current.lt } },
      _sum: { amount: true },
    })
    const sumAfter = (number: string, from: Date) => {
      const later = afterCurrent.find((a) => a.accountNumber === number)
      let sum = later?._sum.amount?.toNumber() ?? 0
      for (const r of rows) {
        if (
          r.accountNumber === number &&
          r.date >= from &&
          r.date < current.lt
        ) {
          sum += r.amount
        }
      }
      return sum
    }
    const firstDate = new Map(
      firstDates.map((f) => [f.accountNumber, f._min.date])
    )
    const balanceAt = (
      account: (typeof accounts)[number],
      end: Date
    ): number | null => {
      const first = firstDate.get(account.number)
      // Before the first imported row we don't know the balance.
      if (!account.balance || !first || end < first) return null
      return account.balance.toNumber() - sumAfter(account.number, end)
    }

    const groupOf = new Map(categorySettings.map((c) => [c.name, c.group]))
    const categoryName = (row: Row) => row.category ?? UNCATEGORISED
    const groupName = (row: Row) =>
      (row.category && groupOf.get(row.category)) ?? UNGROUPED

    const categories = compareBreakdowns(
      breakdown(currentRows, categoryName),
      hasPrevious ? breakdown(previousRows, categoryName) : null
    ).map((c) => ({ ...c, group: groupOf.get(c.name) ?? null }))
    const groups = compareBreakdowns(
      breakdown(currentRows, groupName),
      hasPrevious ? breakdown(previousRows, groupName) : null
    ).map((g) => ({
      ...g,
      categories: categories
        .filter((c) => (c.group ?? UNGROUPED) === g.name)
        .map((c) => c.name),
    }))

    return {
      period: periodKey(period),
      granularity: period.granularity,
      label: periodLabel(period),
      previousLabel: periodLabel(previous),
      periods: availablePeriods(months),
      hasData: currentRows.length > 0,
      hasPrevious,
      unmappedKeys,
      totals: totalsOf(currentRows),
      previousTotals: hasPrevious ? totalsOf(previousRows) : null,
      accounts: accounts.map((a) => {
        const own = currentRows.filter((r) => r.accountNumber === a.number)
        return {
          number: a.number,
          name: a.name,
          balance: balanceAt(a, current.lt),
          previousBalance: balanceAt(a, current.gte),
          in: own
            .filter((r) => r.amount >= 0)
            .reduce((s, r) => s + r.amount, 0),
          out: own
            .filter((r) => r.amount < 0)
            .reduce((s, r) => s - r.amount, 0),
        }
      }),
      categories,
      /** Empty until at least one category has been put in a group. */
      groups: categorySettings.length > 0 ? groups : [],
      /** Every group name, sorted. Gives each group a stable chart colour. */
      groupNames: [
        ...new Set(
          categorySettings
            .map((c) => c.group)
            .filter((g): g is string => Boolean(g))
        ),
      ].sort((a, b) => a.localeCompare(b)),
      history: history.map((p) => {
        const periodRows = rows.filter((r) => inRange(r, periodRange(p)))
        return {
          key: periodKey(p),
          label: shortPeriodLabel(p),
          fullLabel: periodLabel(p),
          hasData: periodRows.length > 0,
          ...totalsOf(periodRows),
        }
      }),
    }
  })

/* ------------------------------------------------------------------ */
/* Spending breakdown                                                  */
/* ------------------------------------------------------------------ */

/**
 * Where the money went in a period: group → category → shop →
 * transactions, each compared to the period before and to the average of
 * the earlier periods in the trend window (11 months, 7 quarters, 4 years).
 */
export const getSpending = createServerFn({ method: "GET" })
  .validator(z.object({ period: periodSchema, account: z.string().optional() }))
  .handler(async ({ data }) => {
    const months = await availableMonths()
    const period = resolvePeriod(data.period, months)
    const periods = periodsEndingWith(
      period,
      HISTORY_LENGTH[period.granularity]
    )
    const ranges = periods.map(periodRange)
    const withData = new Set(
      months.map((m) => periodKey(periodOfMonth(m, period.granularity)))
    )

    const [accounts, transactions, categorySettings] = await Promise.all([
      prisma.account.findMany({
        select: { number: true, name: true },
        orderBy: { number: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          date: { gte: ranges[0].gte, lt: ranges[ranges.length - 1].lt },
          amount: { lt: 0 },
          accountNumber: data.account,
          textKey: { isTransfer: false },
        },
        select: {
          id: true,
          date: true,
          amount: true,
          text: true,
          description: true,
          key: true,
          textKey: { select: { label: true, category: true } },
        },
      }),
      prisma.category.findMany({ where: { group: { not: null } } }),
    ])

    const groupOf = new Map(
      categorySettings.flatMap((c) => (c.group ? [[c.name, c.group]] : []))
    )
    const tree = buildSpendingTree({
      groupOf,
      periodHasData: periods.map((p) => withData.has(periodKey(p))),
      rows: transactions.map((t) => ({
        id: t.id,
        period: ranges.findIndex((r) => t.date >= r.gte && t.date < r.lt),
        date: t.date.toISOString().slice(0, 10),
        amount: -t.amount.toNumber(),
        text: t.text,
        description: t.description,
        key: t.key,
        label: t.textKey.label,
        category: t.textKey.category,
      })),
    })

    const unitLabel = { month: "months", quarter: "quarters", year: "years" }
    const earlierWithData = periods
      .slice(0, -1)
      .filter((p) => withData.has(periodKey(p))).length

    return {
      period: periodKey(period),
      label: periodLabel(period),
      previousLabel: periodLabel(shiftPeriod(period, -1)),
      /** e.g. "the last 11 months". */
      usualLabel:
        earlierWithData === 0
          ? null
          : `${earlierWithData === 1 ? "the" : `the ${earlierWithData}`} previous ${earlierWithData === 1 ? unitLabel[period.granularity].slice(0, -1) : unitLabel[period.granularity]}`,
      periods: availablePeriods(months),
      hasAnyData: months.length > 0,
      accounts,
      grouped: groupOf.size > 0,
      ...tree,
    }
  })

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export const listTransactions = createServerFn({ method: "GET" })
  .validator(
    z.object({
      period: periodSchema,
      direction: z.enum(["in", "out"]),
      account: z.string().optional(),
      includeTransfers: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const months = await availableMonths()
    const period = resolvePeriod(data.period, months)

    const [accounts, rows] = await Promise.all([
      prisma.account.findMany({
        select: { number: true, name: true },
        orderBy: { number: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          date: periodRange(period),
          amount: data.direction === "in" ? { gte: 0 } : { lt: 0 },
          accountNumber: data.account,
          textKey: data.includeTransfers ? undefined : { isTransfer: false },
        },
        include: { textKey: true, account: { select: { name: true } } },
        orderBy: [{ date: "desc" }, { amount: "asc" }],
      }),
    ])

    return {
      period: periodKey(period),
      granularity: period.granularity,
      label: periodLabel(period),
      periods: availablePeriods(months),
      hasAnyData: months.length > 0,
      accounts,
      transactions: rows.map((t) => ({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        accountNumber: t.accountNumber,
        accountName: t.account.name,
        text: t.text,
        key: t.key,
        label: t.textKey.label,
        category: t.textKey.category,
        isTransfer: t.textKey.isTransfer,
        amount: t.amount.toNumber(),
        note: t.note,
        description: t.description,
      })),
    }
  })

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const uploadBankCsv = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected form data")
    const file = data.get("file")
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a CSV file to upload")
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("The file is larger than 5 MB")
    }
    return file
  })
  .handler(async ({ data: file }) => {
    try {
      return await importBankCsv(prisma, {
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      })
    } catch (error) {
      // Parser errors are meant for the user; anything else stays generic.
      if (error instanceof BankCsvError) throw new Error(error.message)
      console.error("[budget] CSV import failed", error)
      throw new Error("The import failed. Nothing was saved.")
    }
  })

export const listImports = createServerFn({ method: "GET" }).handler(
  async () => {
    const imports = await prisma.import.findMany({
      orderBy: { importedAt: "desc" },
      take: 12,
    })
    return imports.map((i) => ({
      id: i.id,
      fileName: i.fileName,
      rowCount: i.rowCount,
      createdCount: i.createdCount,
      importedAt: i.importedAt.toISOString(),
    }))
  }
)

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const getBudgetSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const [accounts, keys, stats, categorySettings] = await Promise.all([
      prisma.account.findMany({ orderBy: { number: "asc" } }),
      prisma.textKey.findMany({ orderBy: { key: "asc" } }),
      prisma.transaction.groupBy({
        by: ["key"],
        _count: { _all: true },
        _sum: { amount: true },
        _max: { date: true, text: true },
      }),
      prisma.category.findMany(),
    ])
    const groupOf = new Map(categorySettings.map((c) => [c.name, c.group]))
    const keysPerCategory = new Map<string, number>()
    for (const k of keys) {
      if (k.category && !k.isTransfer) {
        keysPerCategory.set(
          k.category,
          (keysPerCategory.get(k.category) ?? 0) + 1
        )
      }
    }
    const statsByKey = new Map(stats.map((s) => [s.key, s]))

    return {
      accounts: accounts.map((a) => ({
        number: a.number,
        name: a.name,
        balance: a.balance?.toNumber() ?? null,
      })),
      keys: keys.map((k) => {
        const s = statsByKey.get(k.key)
        return {
          key: k.key,
          label: k.label,
          category: k.category,
          isTransfer: k.isTransfer,
          count: s?._count._all ?? 0,
          total: s?._sum.amount?.toNumber() ?? 0,
          lastDate: s?._max.date?.toISOString().slice(0, 10) ?? null,
          example: s?._max.text ?? null,
        }
      }),
      /** Categories in use on bank texts, with their overarching group. */
      categories: [...keysPerCategory]
        .map(([name, keyCount]) => ({
          name,
          keyCount,
          group: groupOf.get(name) ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      groups: [
        ...new Set(
          categorySettings
            .map((c) => c.group)
            .filter((g): g is string => Boolean(g))
        ),
      ].sort((a, b) => a.localeCompare(b)),
    }
  }
)

const optionalText = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value === "" ? null : value))

export const updateTextKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      key: z.string().min(1),
      label: optionalText,
      category: optionalText,
      isTransfer: z.boolean(),
    })
  )
  .handler(async ({ data: { key, ...values } }) => {
    await prisma.textKey.update({ where: { key }, data: values })
  })

/** The family's own description of a transaction. Empty clears it. */
export const updateTransactionDescription = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      description: z
        .string()
        .trim()
        .max(500)
        .transform((value) => (value === "" ? null : value)),
    })
  )
  .handler(async ({ data }) => {
    await prisma.transaction.update({
      where: { id: data.id },
      data: { description: data.description },
    })
  })

export const updateAccount = createServerFn({ method: "POST" })
  .validator(z.object({ number: z.string().min(1), name: optionalText }))
  .handler(async ({ data }) => {
    await prisma.account.update({
      where: { number: data.number },
      data: { name: data.name },
    })
  })

export const updateCategoryGroup = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().trim().min(1), group: optionalText }))
  .handler(async ({ data }) => {
    await prisma.category.upsert({
      where: { name: data.name },
      create: { name: data.name, group: data.group },
      update: { group: data.group },
    })
  })
