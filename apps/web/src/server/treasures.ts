import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { requireFamily, requireParent } from "@/server/session"

const treasureFields = z.object({
  title: z.string().trim().min(1, "Giv skatten et navn.").max(120),
  cost: z.number().int().min(1, "Den skal koste mindst 1 dublon.").max(100_000),
})

export const listTreasures = createServerFn({ method: "GET" }).handler(
  async () => {
    const { familyId } = await requireFamily()
    return prisma.treasure.findMany({
      where: { familyId },
      select: { id: true, title: true, cost: true },
      orderBy: [{ cost: "asc" }, { title: "asc" }],
    })
  }
)

export const createTreasure = createServerFn({ method: "POST" })
  .validator(treasureFields)
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    const { id } = await prisma.treasure.create({ data: { ...data, familyId } })
    return { id }
  })

export const updateTreasure = createServerFn({ method: "POST" })
  .validator(treasureFields.extend({ id: z.string().min(1) }))
  .handler(async ({ data: { id, ...data } }) => {
    const { familyId } = await requireParent()
    await prisma.treasure.update({ where: { id, familyId }, data })
  })

export const deleteTreasure = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    await prisma.treasure.delete({ where: { id: data.id, familyId } })
  })

/**
 * A parent redeems a treasure from the family's shared chest, once the
 * family has saved up for it together.
 */
export const redeemTreasure = createServerFn({ method: "POST" })
  .validator(z.object({ treasureId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const viewer = await requireParent()
    const { familyId } = viewer
    return prisma.$transaction(async (tx) => {
      // One redemption at a time per family, so the chest can't be spent twice.
      await tx.$executeRaw`SELECT 1 FROM "Family" WHERE id = ${familyId} FOR UPDATE`
      const [treasure, chest] = await Promise.all([
        tx.treasure.findUniqueOrThrow({
          where: { id: data.treasureId, familyId },
        }),
        tx.doubloonEntry.aggregate({
          where: { familyId },
          _sum: { amount: true },
        }),
      ])
      if ((chest._sum.amount ?? 0) < treasure.cost) {
        throw new Error(`Der er ikke dubloner nok til ${treasure.title} endnu.`)
      }
      await tx.doubloonEntry.create({
        data: {
          familyId,
          kind: "purchase",
          amount: -treasure.cost,
          note: treasure.title,
          memberId: viewer.member.id,
          treasureId: treasure.id,
        },
      })
    })
  })
