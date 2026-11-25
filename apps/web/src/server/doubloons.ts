import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { dateOf, toLocalDate, today } from "@/lib/chores"
import { requireFamily, requireParent } from "@/server/session"
import { settleWeeks } from "@/server/settle-weeks"

const memberSelect = {
  id: true,
  name: true,
  color: true,
  emoji: true,
  archived: true,
} as const

/** What's in the family's shared chest. */
export const getChest = createServerFn({ method: "GET" }).handler(async () => {
  const { familyId } = await requireFamily()
  await settleWeeks(familyId, today())
  const chest = await prisma.doubloonEntry.aggregate({
    where: { familyId },
    _sum: { amount: true },
  })
  return { balance: chest._sum.amount ?? 0 }
})

const PAGE = 100

/**
 * The ship's log, for parents: every doubloon earned, lost and spent, newest first,
 * plus the chest's totals and what each member has added to it.
 */
export const getLog = createServerFn({ method: "GET" })
  .validator(
    z.object({
      memberId: z.string().min(1).optional(),
      take: z.number().int().min(1).max(1000).default(PAGE),
    })
  )
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    await settleWeeks(familyId, today())
    const where = data.memberId
      ? { familyId, memberId: data.memberId }
      : { familyId }
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
        where: { familyId },
        select: memberSelect,
        orderBy: [{ archived: "asc" }, { position: "asc" }],
      }),
      prisma.doubloonEntry.groupBy({
        by: ["memberId", "kind"],
        where: { familyId },
        _sum: { amount: true },
        _count: true,
      }),
    ])
    const sum = (kind: string, memberId?: string) =>
      totals
        .filter(
          (t) => t.kind === kind && (!memberId || t.memberId === memberId)
        )
        .reduce((acc, t) => acc + (t._sum.amount ?? 0), 0)
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
      chest: {
        earned: sum("reward"),
        lost: -sum("penalty"),
        spent: -sum("purchase"),
      },
      crew: members
        .filter((m) => !m.archived || totals.some((t) => t.memberId === m.id))
        .map((m) => ({
          ...m,
          earned: sum("reward", m.id),
          chores: totals
            .filter((t) => t.kind === "reward" && t.memberId === m.id)
            .reduce((n, t) => n + t._count, 0),
        })),
    }
  })
