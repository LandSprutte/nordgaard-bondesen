import { prisma } from "@workspace/db"

import { dateOf, penaltyFor, toDbDate, today, weekStart } from "@/lib/chores"

// Server-only. Import this from inside server function handlers only: a plain
// export that uses prisma would otherwise end up in the client bundle.

/** Any number, as long as nothing else uses it as an advisory lock key.
 * Paired with a hash of the family id, so families don't wait on each other. */
const SETTLE_LOCK = 4242002

/**
 * Charges every week a family has ended with chores left undone: each
 * active member loses 10% of their purse per undone chore, one chore after
 * another.
 * Runs lazily on page loads and does nothing once a week is settled.
 */
export async function settleWeeks(familyId: string, on: string = today()) {
  const thisWeek = toDbDate(weekStart(on))
  const [planned, settled] = await Promise.all([
    prisma.weekChore.findMany({
      where: { familyId, week: { lt: thisWeek } },
      distinct: ["week"],
      select: { week: true },
    }),
    prisma.weekSettlement.findMany({
      where: { familyId },
      select: { week: true },
    }),
  ])
  const done = new Set(settled.map((s) => dateOf(s.week)))
  const pending = planned
    .map((p) => dateOf(p.week))
    .filter((week) => !done.has(week))
    .sort()

  for (const week of pending) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SETTLE_LOCK}::int, hashtext(${familyId}))`
      const weekDate = toDbDate(week)
      // Another request may have settled it while we waited.
      const key = { familyId_week: { familyId, week: weekDate } }
      if (await tx.weekSettlement.findUnique({ where: key })) {
        return
      }
      const [undone, members, sums] = await Promise.all([
        tx.weekChore.findMany({
          where: { familyId, week: weekDate, doneById: null },
          orderBy: { position: "asc" },
          select: { id: true, title: true },
        }),
        tx.member.findMany({
          where: { familyId, archived: false },
          select: { id: true },
        }),
        tx.doubloonEntry.groupBy({
          by: ["memberId"],
          where: { familyId },
          _sum: { amount: true },
        }),
      ])
      const balance = new Map(sums.map((s) => [s.memberId, s._sum.amount ?? 0]))
      const charges = []
      for (const chore of undone) {
        for (const member of members) {
          const charge = penaltyFor(balance.get(member.id) ?? 0)
          if (charge === 0) continue
          balance.set(member.id, (balance.get(member.id) ?? 0) - charge)
          charges.push({
            familyId,
            kind: "penalty" as const,
            amount: -charge,
            note: chore.title,
            memberId: member.id,
            weekChoreId: chore.id,
          })
        }
      }
      if (charges.length) await tx.doubloonEntry.createMany({ data: charges })
      await tx.weekSettlement.create({ data: { familyId, week: weekDate } })
    })
  }
}
