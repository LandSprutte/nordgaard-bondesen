import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

export const choreFields = z.object({
  title: z.string().trim().min(1, "Giv tjansen et navn, matros.").max(120),
  doubloons: z.number().int().min(0).max(10_000),
})

/** The chore library: templates that can go into any week. */
export const listTemplates = createServerFn({ method: "GET" }).handler(() =>
  prisma.choreTemplate.findMany({
    select: { id: true, title: true, doubloons: true, items: true },
    orderBy: { title: "asc" },
  })
)

export const saveTemplate = createServerFn({ method: "POST" })
  .validator(
    choreFields.extend({
      id: z.string().min(1).optional(),
      items: z.array(z.string().trim().min(1).max(200)).max(100),
    })
  )
  .handler(async ({ data: { id, ...data } }) => {
    const template = id
      ? await prisma.choreTemplate.update({ where: { id }, data })
      : await prisma.choreTemplate.create({ data })
    return { id: template.id }
  })

/** Weeks already planned keep their copy. */
export const deleteTemplate = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await prisma.choreTemplate.delete({ where: { id: data.id } })
  })
