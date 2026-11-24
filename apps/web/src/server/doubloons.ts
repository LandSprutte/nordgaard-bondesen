import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { dateOf, toLocalDate, today } from "@/lib/chores"
import { settleWeeks } from "@/server/settle-weeks"

const memberSelect = {
  id: true,
  name: true,
  color: true,
  emoji: true,
  archived: true,
} as const

/** Everyone in the crew with what's in their purse. */
export const getPurses = createServerFn({ method: "GET" }).handler(async () => {
  await settleWeeks(today())
  const [members, sums] = await Promise.all([
    prisma.member.findMany({
      where: { archived: false },
      select: memberSelect,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.doubloonEntry.groupBy({
      by: ["memberId"],
      _sum: { amount: true },
    }),
  ])
  const balance = new Map(sums.map((s) => [s.memberId, s._sum.amount ?? 0]))
  return members.map((m) => ({ ...m, balance: balance.get(m.id) ?? 0 }))
})

const PAGE = 100

/**
 * The ship's log: every doubloon earned, lost and spent, newest first,
 * plus each member's totals.
 */
export const getLog = createServerFn({ method: "GET" })
  .validator(
    z.object({
      memberId: z.string().min(1).optional(),
      take: z.number().int().min(1).max(1000).default(PAGE),
    })
  )
  .handler(async ({ data }) => {
    await settleWeeks(today())
    const where = data.memberId ? { memberId: data.memberId } : {}
    const [entries, total, members, totals] = await Promise.all([
      prisma.doubloonEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: data.take,
        select: {
          id: true,
          kind: true,
          amount: true,
          note: true,
          createdAt: true,
          member: { select: memberSelect },
          weekChore: { select: { week: true } },
        },
      }),
      prisma.doubloonEntry.count({ where }),
      prisma.member.findMany({
        select: memberSelect,
        orderBy: [{ archived: "asc" }, { position: "asc" }],
      }),
      prisma.doubloonEntry.groupBy({
        by: ["memberId", "kind"],
        _sum: { amount: true },
        _count: true,
      }),
    ])
    const sum = (memberId: string, kind: string) =>
      totals.find((t) => t.memberId === memberId && t.kind === kind)?._sum
        .amount ?? 0
    return {
      entries: entries.map(({ createdAt, weekChore, ...entry }) => ({
        ...entry,
        date: toLocalDate(createdAt),
        time: createdAt.toLocaleTimeString("da-DK", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Copenhagen",
        }),
        week: weekChore ? dateOf(weekChore.week) : null,
      })),
      hasMore: total > entries.length,
      crew: members
        .filter((m) => !m.archived || totals.some((t) => t.memberId === m.id))
        .map((m) => ({
          ...m,
          earned: sum(m.id, "reward"),
          lost: -sum(m.id, "penalty"),
          spent: -sum(m.id, "purchase"),
        })),
    }
  })
