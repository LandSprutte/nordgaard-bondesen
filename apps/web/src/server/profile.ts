import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { addDays, dateOf, toLocalDate, today, weekStart } from "@/lib/chores"
import { streaks } from "@/lib/progress"
import { requireFamily } from "@/server/session"

/** How many weeks the chart on the profile goes back. */
const WEEKS = 8

const memberSelect = {
  id: true,
  name: true,
  color: true,
  emoji: true,
  role: true,
  archived: true,
} as const

/**
 * One member's progression: experience, streaks, favourite chores and the
 * last weeks, plus where they stand in the family. Defaults to whoever is
 * playing on this device.
 */
export const getProfile = createServerFn({ method: "GET" })
  .validator(z.object({ memberId: z.string().min(1).optional() }))
  .handler(async ({ data }) => {
    const viewer = await requireFamily()
    const { familyId } = viewer
    const memberId = data.memberId ?? viewer.member.id
    const on = today()

    const [member, crew, rewards, totals] = await Promise.all([
      prisma.member.findFirstOrThrow({
        where: { id: memberId, familyId },
        select: { ...memberSelect, createdAt: true },
      }),
      prisma.member.findMany({
        where: { familyId, archived: false },
        select: memberSelect,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      prisma.doubloonEntry.findMany({
        where: { familyId, memberId, kind: "reward" },
        orderBy: { createdAt: "asc" },
        select: {
          amount: true,
          note: true,
          createdAt: true,
          weekChore: { select: { week: true } },
        },
      }),
      prisma.doubloonEntry.groupBy({
        by: ["memberId"],
        where: { familyId, kind: "reward" },
        _sum: { amount: true },
      }),
    ])

    const done = rewards.map((r) => {
      const date = toLocalDate(r.createdAt)
      return {
        amount: r.amount,
        note: r.note,
        date,
        week: r.weekChore ? dateOf(r.weekChore.week) : weekStart(date),
      }
    })
    const xp = done.reduce((sum, r) => sum + r.amount, 0)

    // The last weeks, oldest first, including empty ones.
    const thisWeek = weekStart(on)
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const week = addDays(thisWeek, (i - WEEKS + 1) * 7)
      const mine = done.filter((r) => r.week === week)
      return {
        week,
        xp: mine.reduce((sum, r) => sum + r.amount, 0),
        chores: mine.length,
      }
    })

    // Favourite chores: the ones done most often.
    const byChore = new Map<string, { count: number; xp: number }>()
    for (const r of done) {
      const c = byChore.get(r.note) ?? { count: 0, xp: 0 }
      byChore.set(r.note, { count: c.count + 1, xp: c.xp + r.amount })
    }
    const favourites = [...byChore]
      .map(([title, c]) => ({ title, ...c }))
      .sort((a, b) => b.count - a.count || b.xp - a.xp)
      .slice(0, 5)

    // Which weekday they get the most done on, 0 = Monday.
    const perWeekday = Array.from({ length: 7 }, () => 0)
    for (const r of done) {
      const weekday = (new Date(`${r.date}T12:00:00Z`).getUTCDay() + 6) % 7
      perWeekday[weekday]++
    }

    const family = totals.reduce((sum, t) => sum + (t._sum.amount ?? 0), 0)
    const ranking = totals
      .filter((t) => crew.some((m) => m.id === t.memberId))
      .map((t) => t._sum.amount ?? 0)
      .sort((a, b) => b - a)
    const biggest = done.reduce<(typeof done)[number] | null>(
      (top, r) => (!top || r.amount > top.amount ? r : top),
      null
    )

    return {
      member: {
        id: member.id,
        name: member.name,
        color: member.color,
        emoji: member.emoji,
        isParent: member.role === "parent",
        archived: member.archived,
      },
      isMe: member.id === viewer.member.id,
      crew,
      xp,
      chores: done.length,
      thisWeek: weeks.at(-1) ?? { week: thisWeek, xp: 0, chores: 0 },
      weeks,
      streak: streaks(
        done.map((r) => r.date),
        on
      ),
      favourites,
      perWeekday,
      biggest: biggest && { title: biggest.note, xp: biggest.amount },
      /** Share of everything the family has earned, 0–1. */
      share: family > 0 ? xp / family : 0,
      /** 1 = earned the most in the family. Null for archived members. */
      rank: member.archived ? null : ranking.filter((x) => x > xp).length + 1,
      crewSize: crew.length,
      firstDate: done.at(0)?.date ?? null,
    }
  })
