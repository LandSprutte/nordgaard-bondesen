import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { requireParent } from "@/server/session"

export const choreFields = z.object({
  title: z.string().trim().min(1, "Giv tjansen et navn, matros.").max(120),
  doubloons: z.number().int().min(0).max(10_000),
})

/** The chore library: templates that can go into any week. */
export const listTemplates = createServerFn({ method: "GET" }).handler(
  async () => {
    const viewer = await requireParent()
    return prisma.choreTemplate.findMany({
      where: { familyId: viewer.familyId },
      select: { id: true, title: true, doubloons: true, items: true },
      orderBy: { title: "asc" },
    })
  }
)

export const saveTemplate = createServerFn({ method: "POST" })
  .validator(
    choreFields.extend({
      id: z.string().min(1).optional(),
      items: z.array(z.string().trim().min(1).max(200)).max(100),
    })
  )
  .handler(async ({ data: { id, ...data } }) => {
    const { familyId } = await requireParent()
    const template = id
      ? await prisma.choreTemplate.update({ where: { id, familyId }, data })
      : await prisma.choreTemplate.create({ data: { ...data, familyId } })
    return { id: template.id }
  })

/** Weeks already planned keep their copy. */
export const deleteTemplate = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { familyId } = await requireParent()
    await prisma.choreTemplate.delete({ where: { id: data.id, familyId } })
  })
