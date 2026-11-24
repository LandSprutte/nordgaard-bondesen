import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"
import type { Prisma } from "@workspace/db"

import { choreFields } from "@/server/chore-library"
import {
  addDays,
  dateOf,
  toDbDate,
  toLocalDate,
  today,
  weekStart,
} from "@/lib/chores"
import { requireFamily, requireParent } from "@/server/session"
import { settleWeeks } from "@/server/settle-weeks"

/** How far back to look for the streak of days with chores done. */
const STREAK_DAYS = 120

const weekInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const memberSelect = {
  id: true,
  name: true,
  color: true,
  emoji: true,
  archived: true,
} as const

const choreInclude = {
  items: {
    orderBy: { position: "asc" },
    select: { id: true, label: true, done: true },
  },
  doneBy: { select: memberSelect },
} as const

function present(
  chore: Prisma.WeekChoreGetPayload<{ include: typeof choreInclude }>
) {
  return {
    id: chore.id,
    title: chore.title,
    doubloons: chore.doubloons,
    position: chore.position,
    items: chore.items,
    doneBy: chore.doneBy,
    /** Local date it was finished, if it is. */
    doneOn: chore.doneAt ? toLocalDate(chore.doneAt) : null,
  }
}

export type WeekChore = ReturnType<typeof present>

/** Past weeks are settled and read-only; this week and later can change. */
function assertEditable(week: Date) {
  if (dateOf(week) < weekStart(today())) {
    throw new Error("Det togt er slut og kan ikke ændres længere.")
  }
}

/**
 * Takes the chore's row lock, so completions and edits don't race. Only
 * finds chores in the viewer's family.
 */
async function lockChore(
  tx: Prisma.TransactionClient,
  id: string,
  familyId: string
) {
  await tx.$executeRaw`SELECT 1 FROM "WeekChore" WHERE id = ${id} AND "familyId" = ${familyId} FOR UPDATE`
  const chore = await tx.weekChore.findUniqueOrThrow({
    where: { id, familyId },
    include: { items: { select: { id: true, done: true } } },
  })
  assertEditable(chore.week)
  return chore
}

/** Takes back whatever was paid for finishing a chore. */
function takeBackReward(tx: Prisma.TransactionClient, weekChoreId: string) {
  return tx.doubloonEntry.deleteMany({
    where: { weekChoreId, kind: "reward" },
  })
}

/**
 * A week's chores in order, plus the crew: everyone's purse and what they
 * earned that week. Defaults to this week.
 */
export const getWeek = createServerFn({ method: "GET" })
  .validator(z.object({ week: weekInput.optional() }))
  .handler(async ({ data }) => {
    const viewer = await requireFamily()
    const { familyId } = viewer
    const on = today()
    await settleWeeks(familyId, on)
    const thisWeek = weekStart(on)
    const week = weekStart(data.week ?? on)
    const weekDate = toDbDate(week)
    const lastWeekDate = toDbDate(addDays(week, -7))

    const [chores, members, balances, earned, xp, finishes, recent, lastWeek] =
      await Promise.all([
        prisma.weekChore.findMany({
          where: { familyId, week: weekDate },
          orderBy: { position: "asc" },
          include: choreInclude,
        }),
        prisma.member.findMany({
          where: { familyId },
          select: memberSelect,
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        }),
        prisma.doubloonEntry.groupBy({
          by: ["memberId"],
          where: { familyId },
          _sum: { amount: true },
        }),
        prisma.doubloonEntry.groupBy({
          by: ["memberId"],
          where: { familyId, kind: "reward", weekChore: { week: weekDate } },
          _sum: { amount: true },
        }),
        // Everything ever earned from chores, as experience.
        prisma.doubloonEntry.groupBy({
          by: ["memberId"],
          where: { familyId, kind: "reward" },
          _sum: { amount: true },
        }),
        // When chores got finished lately, for the streak.
        prisma.weekChore.findMany({
          where: {
            familyId,
            doneAt: { gte: new Date(Date.now() - STREAK_DAYS * 86_400_000) },
          },
          select: { doneAt: true },
        }),
        prisma.doubloonEntry.findMany({
          where: { familyId },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            kind: true,
            amount: true,
            note: true,
            createdAt: true,
            member: { select: memberSelect },
          },
        }),
        prisma.weekChore.findMany({
          where: { familyId, week: lastWeekDate, doneById: null },
          select: {
            title: true,
            entries: {
              where: { kind: "penalty" },
              select: { amount: true, memberId: true },
            },
          },
        }),
      ])

    const balanceOf = new Map(balances.map((b) => [b.memberId, b._sum.amount]))
    const earnedOf = new Map(earned.map((b) => [b.memberId, b._sum.amount]))
    const xpOf = new Map(xp.map((b) => [b.memberId, b._sum.amount]))
    const doneDates = new Set(
      finishes.flatMap((f) => (f.doneAt ? [toLocalDate(f.doneAt)] : []))
    )
    // Days in a row, up to yesterday, with at least one chore finished.
    let streakBeforeToday = 0
    while (doneDates.has(addDays(on, -streakBeforeToday - 1))) {
      streakBeforeToday++
    }
    const presented = chores.map(present)
    const crew = members
      // Archived members only show up on weeks they took part in.
      .filter(
        (m) => !m.archived || presented.some((c) => c.doneBy?.id === m.id)
      )
      .map((m) => ({
        ...m,
        balance: balanceOf.get(m.id) ?? 0,
        earned: earnedOf.get(m.id) ?? 0,
        xp: xpOf.get(m.id) ?? 0,
      }))

    const lostLastWeek = new Map<string, number>()
    for (const entry of lastWeek.flatMap((c) => c.entries)) {
      lostLastWeek.set(
        entry.memberId,
        (lostLastWeek.get(entry.memberId) ?? 0) - entry.amount
      )
    }

    return {
      /** Who is playing on this device. */
      me: { id: viewer.member.id, isParent: viewer.isParent },
      today: on,
      thisWeek,
      week,
      editable: week >= thisWeek,
      chores: presented,
      crew,
      streakBeforeToday,
      recent: recent.map(({ createdAt, ...entry }) => ({
        ...entry,
        date: toLocalDate(createdAt),
      })),
      /** Chores left undone last week (only once it's over) and what it cost. */
      lastWeek:
        addDays(week, -7) < thisWeek && week <= thisWeek
          ? {
              undone: lastWeek.map((c) => c.title),
              lost: crew
                .map((m) => ({
                  member: m,
                  amount: lostLastWeek.get(m.id) ?? 0,
                }))
                .filter((l) => l.amount > 0),
            }
          : null,
    }
  })

/** Puts a library chore into a week, at `position` or at the end. */
export const addToWeek = createServerFn({ method: "POST" })
  .validator(
    z.object({
      week: weekInput,
      templateId: z.string().min(1),
      position: z.number().int().min(0).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    const week = toDbDate(weekStart(data.week))
    assertEditable(week)
    return prisma.$transaction(async (tx) => {
      const template = await tx.choreTemplate.findUniqueOrThrow({
        where: { id: data.templateId, familyId },
      })
      const count = await tx.weekChore.count({ where: { familyId, week } })
      const position = Math.min(data.position ?? count, count)
      await tx.weekChore.updateMany({
        where: { familyId, week, position: { gte: position } },
        data: { position: { increment: 1 } },
      })
      const chore = await tx.weekChore.create({
        data: {
          familyId,
          week,
          position,
          title: template.title,
          doubloons: template.doubloons,
          templateId: template.id,
          items: {
            create: template.items.map((label, i) => ({ label, position: i })),
          },
        },
      })
      return { id: chore.id }
    })
  })

/** Adds fresh copies of the previous week's chores to the end of a week. */
export const copyPreviousWeek = createServerFn({ method: "POST" })
  .validator(z.object({ week: weekInput }))
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    const monday = weekStart(data.week)
    const week = toDbDate(monday)
    assertEditable(week)
    return prisma.$transaction(async (tx) => {
      const [previous, count] = await Promise.all([
        tx.weekChore.findMany({
          where: { familyId, week: toDbDate(addDays(monday, -7)) },
          orderBy: { position: "asc" },
          include: { items: { orderBy: { position: "asc" } } },
        }),
        tx.weekChore.count({ where: { familyId, week } }),
      ])
      for (const [i, chore] of previous.entries()) {
        await tx.weekChore.create({
          data: {
            familyId,
            week,
            position: count + i,
            title: chore.title,
            doubloons: chore.doubloons,
            templateId: chore.templateId,
            items: {
              create: chore.items.map((item) => ({
                label: item.label,
                position: item.position,
              })),
            },
          },
        })
      }
      return { copied: previous.length }
    })
  })

/**
 * Edits a chore in a week. A done chore stays done; if its reward changes,
 * the member who did it gets the new amount.
 */
export const updateWeekChore = createServerFn({ method: "POST" })
  .validator(
    choreFields.extend({
      id: z.string().min(1),
      items: z
        .array(
          z.object({
            id: z.string().min(1).optional(),
            label: z.string().trim().min(1).max(200),
          })
        )
        .max(100),
    })
  )
  .handler(async ({ data: { id, items, ...fields } }) => {
    const { familyId } = await requireParent()
    return prisma.$transaction(async (tx) => {
      const chore = await lockChore(tx, id, familyId)
      await tx.weekChore.update({ where: { id }, data: fields })

      const existingIds = new Set(chore.items.map((item) => item.id))
      const keptIds = new Set(
        items.flatMap((item) =>
          item.id && existingIds.has(item.id) ? [item.id] : []
        )
      )
      await tx.weekChoreItem.deleteMany({
        where: { weekChoreId: id, id: { notIn: [...keptIds] } },
      })
      for (const [position, item] of items.entries()) {
        if (item.id && keptIds.has(item.id)) {
          await tx.weekChoreItem.update({
            where: { id: item.id },
            data: { label: item.label, position },
          })
        } else {
          await tx.weekChoreItem.create({
            data: {
              weekChoreId: id,
              label: item.label,
              position,
              done: chore.doneById !== null,
            },
          })
        }
      }

      if (chore.doneById && fields.doubloons !== chore.doubloons) {
        await takeBackReward(tx, id)
        if (fields.doubloons > 0) {
          await tx.doubloonEntry.create({
            data: {
              familyId,
              kind: "reward",
              amount: fields.doubloons,
              note: fields.title,
              memberId: chore.doneById,
              weekChoreId: id,
            },
          })
        }
      }
    })
  })

/** Takes a chore out of its week, and back from whoever did it. */
export const removeWeekChore = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    return prisma.$transaction(async (tx) => {
      const chore = await lockChore(tx, data.id, familyId)
      await takeBackReward(tx, data.id)
      await tx.weekChore.delete({ where: { id: data.id } })
      await tx.weekChore.updateMany({
        where: { familyId, week: chore.week, position: { gt: chore.position } },
        data: { position: { decrement: 1 } },
      })
    })
  })

/** Moves a chore to another place in its week. */
export const moveWeekChore = createServerFn({ method: "POST" })
  .validator(
    z.object({ id: z.string().min(1), position: z.number().int().min(0) })
  )
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    return prisma.$transaction(async (tx) => {
      const chore = await tx.weekChore.findUniqueOrThrow({
        where: { id: data.id, familyId },
      })
      assertEditable(chore.week)
      const order = await tx.weekChore.findMany({
        where: { familyId, week: chore.week },
        orderBy: { position: "asc" },
        select: { id: true },
      })
      const ids = order.map((c) => c.id).filter((id) => id !== chore.id)
      ids.splice(Math.min(data.position, ids.length), 0, chore.id)
      for (const [position, id] of ids.entries()) {
        await tx.weekChore.update({ where: { id }, data: { position } })
      }
    })
  })

/**
 * Ticks a checklist item. Unticking an item on a done chore reopens it and
 * takes the reward back, which only a parent may do. Says whether every item is now ticked, so the
 * page can ask who did it.
 */
export const setWeekChoreItemDone = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), done: z.boolean() }))
  .handler(async ({ data }) => {
    const viewer = await requireFamily()
    const item = await prisma.weekChoreItem.findFirstOrThrow({
      where: { id: data.id, weekChore: { familyId: viewer.familyId } },
      select: { weekChoreId: true },
    })
    return prisma.$transaction(async (tx) => {
      const chore = await lockChore(tx, item.weekChoreId, viewer.familyId)
      if (!data.done && chore.doneById && !viewer.isParent) {
        throw new Error("Kun en forælder kan fortryde en klaret tjans.")
      }
      await tx.weekChoreItem.update({
        where: { id: data.id },
        data: { done: data.done },
      })
      if (!data.done && chore.doneById) {
        await takeBackReward(tx, chore.id)
        await tx.weekChore.update({
          where: { id: chore.id },
          data: { doneById: null, doneAt: null },
        })
      }
      const allTicked = chore.items.every((i) =>
        i.id === data.id ? data.done : i.done
      )
      return { allTicked }
    })
  })

/**
 * Finishes a chore for the member who did it: every item ticked, and the
 * whole reward to them (moved from someone else if it was already done).
 * Children can only finish chores as themselves, and can't move one that's
 * already done.
 */
export const completeWeekChore = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), memberId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const viewer = await requireFamily()
    if (!viewer.isParent && data.memberId !== viewer.member.id) {
      throw new Error("Du kan kun klare tjanser for dig selv.")
    }
    return prisma.$transaction(async (tx) => {
      const chore = await lockChore(tx, data.id, viewer.familyId)
      if (chore.doneById && !viewer.isParent) {
        throw new Error("Den tjans er allerede klaret.")
      }
      const member = await tx.member.findUniqueOrThrow({
        where: { id: data.memberId, familyId: viewer.familyId },
      })
      if (member.archived) throw new Error(`${member.name} er gået i land.`)
      await tx.weekChoreItem.updateMany({
        where: { weekChoreId: chore.id },
        data: { done: true },
      })
      await tx.weekChore.update({
        where: { id: chore.id },
        data: { doneById: member.id, doneAt: chore.doneAt ?? new Date() },
      })
      await takeBackReward(tx, chore.id)
      if (chore.doubloons > 0) {
        await tx.doubloonEntry.create({
          data: {
            familyId: viewer.familyId,
            kind: "reward",
            amount: chore.doubloons,
            note: chore.title,
            memberId: member.id,
            weekChoreId: chore.id,
          },
        })
      }
    })
  })

/**
 * Marks a done chore as not done again and takes the reward back. Parents
 * only.
 */
export const reopenWeekChore = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    return prisma.$transaction(async (tx) => {
      const chore = await lockChore(tx, data.id, familyId)
      await takeBackReward(tx, chore.id)
      await tx.weekChore.update({
        where: { id: chore.id },
        data: { doneById: null, doneAt: null },
      })
    })
  })
