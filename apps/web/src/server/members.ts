import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import { MIN_PASSWORD } from "@/lib/passwords"
import { hashPassword, requireParent } from "@/server/session"

const memberFields = z.object({
  name: z.string().trim().min(1, "Giv piraten et navn.").max(40),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Vælg en farve."),
  emoji: z.string().trim().min(1, "Vælg en emoji.").max(16),
  role: z.enum(["parent", "child"]),
  /** Parents only: what they log in with. */
  email: z
    .email("Skriv en gyldig email.")
    .trim()
    .toLowerCase()
    .max(200)
    .optional(),
  /** Parents only. Leave out when editing to keep the current one. */
  password: z
    .string()
    .min(MIN_PASSWORD, `Kodeordet skal være mindst ${MIN_PASSWORD} tegn.`)
    .max(200)
    .optional(),
})

type Fields = z.infer<typeof memberFields>

/** What to store for a member's role, email and password. */
async function loginFields(
  data: Fields,
  existing: { id: string; passwordHash: string | null } | null
) {
  if (data.role === "child") {
    return {
      role: "child" as const,
      plan: "basic" as const,
      email: null,
      passwordHash: null,
    }
  }
  if (!data.email) throw new Error("En forælder skal have en email.")
  const taken = await prisma.member.findUnique({
    where: { email: data.email },
    select: { id: true },
  })
  if (taken && taken.id !== existing?.id) {
    throw new Error(`Der findes allerede en konto med ${data.email}.`)
  }
  const passwordHash = data.password
    ? await hashPassword(data.password)
    : existing?.passwordHash
  if (!passwordHash) throw new Error("En forælder skal have et kodeord.")
  return { role: "parent" as const, email: data.email, passwordHash }
}

/** Everyone in Settings → Family, archived members last. */
export const listMembers = createServerFn({ method: "GET" }).handler(
  async () => {
    const viewer = await requireParent()
    const members = await prisma.member.findMany({
      where: { familyId: viewer.familyId },
      select: {
        id: true,
        name: true,
        color: true,
        emoji: true,
        archived: true,
        role: true,
        plan: true,
        email: true,
      },
      orderBy: [{ archived: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    })
    return { members, me: viewer.member.id }
  }
)

/** A parent adds a child or a co-parent to their family. */
export const createMember = createServerFn({ method: "POST" })
  .validator(memberFields)
  .handler(async ({ data }) => {
    const viewer = await requireParent()
    const login = await loginFields(data, null)
    const last = await prisma.member.aggregate({
      where: { familyId: viewer.familyId },
      _max: { position: true },
    })
    const { id } = await prisma.member.create({
      data: {
        familyId: viewer.familyId,
        name: data.name,
        color: data.color,
        emoji: data.emoji,
        ...login,
        position: (last._max.position ?? -1) + 1,
      },
    })
    return { id }
  })

export const updateMember = createServerFn({ method: "POST" })
  .validator(memberFields.extend({ id: z.string().min(1) }))
  .handler(async ({ data: { id, ...data } }) => {
    const viewer = await requireParent()
    if (id === viewer.member.id && data.role !== "parent") {
      throw new Error("Du kan ikke gøre dig selv til barn.")
    }
    const existing = await prisma.member.findFirstOrThrow({
      where: { id, familyId: viewer.familyId },
      select: { id: true, passwordHash: true, role: true },
    })
    const login = await loginFields(data, existing)
    await prisma.$transaction([
      prisma.member.update({
        where: { id },
        data: {
          name: data.name,
          color: data.color,
          emoji: data.emoji,
          ...login,
        },
      }),
      // A new password or a lost role logs them out everywhere else.
      ...(data.password || login.role !== existing.role
        ? [
            prisma.session.deleteMany({
              where: { memberId: id, id: { not: viewer.sessionId } },
            }),
          ]
        : []),
    ])
  })

/**
 * Removes a member. Someone with doubloons or finished chores is archived
 * instead, so old weeks keep their colour.
 */
export const removeMember = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const viewer = await requireParent()
    if (data.id === viewer.member.id) {
      throw new Error("Du kan ikke fjerne dig selv.")
    }
    await prisma.member.findFirstOrThrow({
      where: { id: data.id, familyId: viewer.familyId },
    })
    const [entries, chores] = await Promise.all([
      prisma.doubloonEntry.count({ where: { memberId: data.id } }),
      prisma.weekChore.count({ where: { doneById: data.id } }),
    ])
    if (entries + chores > 0) {
      await prisma.$transaction([
        prisma.member.update({
          where: { id: data.id },
          data: { archived: true },
        }),
        prisma.session.deleteMany({ where: { memberId: data.id } }),
      ])
      return { archived: true }
    }
    await prisma.member.delete({ where: { id: data.id } })
    return { archived: false }
  })

export const restoreMember = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const viewer = await requireParent()
    await prisma.member.update({
      where: { id: data.id, familyId: viewer.familyId },
      data: { archived: false },
    })
  })
