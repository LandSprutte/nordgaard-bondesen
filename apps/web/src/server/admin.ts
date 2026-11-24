import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { MEMBER_COLORS, MEMBER_EMOJIS } from "@/lib/chores"
import { MIN_PASSWORD } from "@/lib/passwords"
import { hashPassword, requireAdmin } from "@/server/session"

const password = z
  .string()
  .min(MIN_PASSWORD, `Kodeordet skal være mindst ${MIN_PASSWORD} tegn.`)
  .max(200)

/** Every family with its people, for the admin page. */
export const getAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin()
    const families = await prisma.family.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        members: {
          orderBy: [{ role: "asc" }, { position: "asc" }],
          select: {
            id: true,
            name: true,
            emoji: true,
            color: true,
            role: true,
            plan: true,
            email: true,
            archived: true,
          },
        },
        _count: { select: { transactions: true, weekChores: true } },
      },
    })
    return families.map(({ createdAt, _count, ...family }) => ({
      ...family,
      createdAt: createdAt.toISOString().slice(0, 10),
      transactions: _count.transactions,
      chores: _count.weekChores,
    }))
  }
)

/**
 * Creates a parent who can log in, in an existing family or a new one
 * named `familyName`.
 */
export const createParentAccount = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        name: z.string().trim().min(1, "Skriv et navn.").max(40),
        email: z.email("Skriv en gyldig email.").trim().toLowerCase().max(200),
        password,
        plan: z.enum(["basic", "pro"]),
        familyId: z.string().min(1).optional(),
        familyName: z.string().trim().min(1).max(80).optional(),
      })
      .refine((d) => d.familyId || d.familyName, {
        message: "Vælg en familie, eller giv den nye familie et navn.",
      })
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    if (await prisma.member.findUnique({ where: { email: data.email } })) {
      throw new Error(`Der findes allerede en konto med ${data.email}.`)
    }
    const passwordHash = await hashPassword(data.password)
    return prisma.$transaction(async (tx) => {
      const familyId =
        data.familyId ??
        (await tx.family.create({ data: { name: data.familyName ?? "" } })).id
      if (data.familyId) {
        await tx.family.findUniqueOrThrow({ where: { id: data.familyId } })
      }
      const count = await tx.member.count({ where: { familyId } })
      const member = await tx.member.create({
        data: {
          familyId,
          role: "parent",
          plan: data.plan,
          name: data.name,
          email: data.email,
          passwordHash,
          color: MEMBER_COLORS[count % MEMBER_COLORS.length],
          emoji: MEMBER_EMOJIS[count % MEMBER_EMOJIS.length],
          position: count,
        },
      })
      return { id: member.id, familyId }
    })
  })

/** Sets a new password for a parent and logs out their devices. */
export const resetParentPassword = createServerFn({ method: "POST" })
  .validator(z.object({ memberId: z.string().min(1), password }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const passwordHash = await hashPassword(data.password)
    await prisma.$transaction([
      prisma.member.update({
        where: { id: data.memberId, role: "parent" },
        data: { passwordHash },
      }),
      prisma.session.deleteMany({ where: { memberId: data.memberId } }),
    ])
  })

/** Basic parents get the chores; pro parents also the budget and calendar. */
export const setParentPlan = createServerFn({ method: "POST" })
  .validator(
    z.object({ memberId: z.string().min(1), plan: z.enum(["basic", "pro"]) })
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    await prisma.member.update({
      where: { id: data.memberId, role: "parent" },
      data: { plan: data.plan },
    })
  })
