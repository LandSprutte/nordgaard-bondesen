import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

const treasureFields = z.object({
  title: z.string().trim().min(1, "Giv skatten et navn.").max(120),
  cost: z.number().int().min(1, "Den skal koste mindst 1 dublon.").max(100_000),
})

export const listTreasures = createServerFn({ method: "GET" }).handler(() =>
  prisma.treasure.findMany({
    select: { id: true, title: true, cost: true },
    orderBy: [{ cost: "asc" }, { title: "asc" }],
  })
)

export const createTreasure = createServerFn({ method: "POST" })
  .validator(treasureFields)
  .handler(async ({ data }) => {
    const { id } = await prisma.treasure.create({ data })
    return { id }
  })

export const updateTreasure = createServerFn({ method: "POST" })
  .validator(treasureFields.extend({ id: z.string().min(1) }))
  .handler(async ({ data: { id, ...data } }) => {
    await prisma.treasure.update({ where: { id }, data })
  })

export const deleteTreasure = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await prisma.treasure.delete({ where: { id: data.id } })
  })

/** A member buys a treasure, if they can afford it. */
export const claimTreasure = createServerFn({ method: "POST" })
  .validator(
    z.object({ treasureId: z.string().min(1), memberId: z.string().min(1) })
  )
  .handler(({ data }) =>
    prisma.$transaction(async (tx) => {
      // One purchase at a time per member, so the balance can't be spent twice.
      await tx.$executeRaw`SELECT 1 FROM "Member" WHERE id = ${data.memberId} FOR UPDATE`
      const [treasure, member, balance] = await Promise.all([
        tx.treasure.findUniqueOrThrow({ where: { id: data.treasureId } }),
        tx.member.findUniqueOrThrow({ where: { id: data.memberId } }),
        tx.doubloonEntry.aggregate({
          where: { memberId: data.memberId },
          _sum: { amount: true },
        }),
      ])
      if (member.archived) throw new Error(`${member.name} er gået i land.`)
      if ((balance._sum.amount ?? 0) < treasure.cost) {
        throw new Error(
          `${member.name} har ikke dubloner nok til ${treasure.title} endnu.`
        )
      }
      await tx.doubloonEntry.create({
        data: {
          kind: "purchase",
          amount: -treasure.cost,
          note: treasure.title,
          memberId: member.id,
          treasureId: treasure.id,
        },
      })
    })
  )
