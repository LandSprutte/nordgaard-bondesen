import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

const memberFields = z.object({
  name: z.string().trim().min(1, "Giv piraten et navn.").max(40),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Vælg en farve."),
  emoji: z.string().trim().min(1, "Vælg en emoji.").max(16),
})

/** Everyone in Settings → Family, archived members last. */
export const listMembers = createServerFn({ method: "GET" }).handler(() =>
  prisma.member.findMany({
    select: { id: true, name: true, color: true, emoji: true, archived: true },
    orderBy: [{ archived: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  })
)

export const createMember = createServerFn({ method: "POST" })
  .validator(memberFields)
  .handler(async ({ data }) => {
    const last = await prisma.member.aggregate({ _max: { position: true } })
    const { id } = await prisma.member.create({
      data: { ...data, position: (last._max.position ?? -1) + 1 },
    })
    return { id }
  })

export const updateMember = createServerFn({ method: "POST" })
  .validator(memberFields.extend({ id: z.string().min(1) }))
  .handler(async ({ data: { id, ...data } }) => {
    await prisma.member.update({ where: { id }, data })
  })

/**
 * Removes a member. Someone with doubloons or finished chores is archived
 * instead, so old weeks keep their colour.
 */
export const removeMember = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const [entries, chores] = await Promise.all([
      prisma.doubloonEntry.count({ where: { memberId: data.id } }),
      prisma.weekChore.count({ where: { doneById: data.id } }),
    ])
    if (entries + chores > 0) {
      await prisma.member.update({
        where: { id: data.id },
        data: { archived: true },
      })
      return { archived: true }
    }
    await prisma.member.delete({ where: { id: data.id } })
    return { archived: false }
  })

export const restoreMember = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await prisma.member.update({
      where: { id: data.id },
      data: { archived: false },
    })
  })
