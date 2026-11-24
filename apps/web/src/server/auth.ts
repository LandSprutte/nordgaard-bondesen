import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { prisma } from "@workspace/db"

import {
  currentSession,
  endSession,
  failSlowly,
  requireFamily,
  sameText,
  startSession,
  verifyPassword,
  viewerOf,
} from "@/server/session"

/**
 * Who is using this browser: the admin, someone in a family (and which
 * family), or nobody.
 */
export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
  const session = await currentSession()
  if (session?.kind === "admin") return { kind: "admin" as const }
  const viewer = await viewerOf(session)
  if (!viewer) return null
  return {
    kind: "family" as const,
    family: viewer.family,
    member: viewer.member,
    isParent: viewer.isParent,
    isPro: viewer.isPro,
  }
})

/** A parent logs the device in to their family. */
export const login = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().toLowerCase().max(200),
      password: z.string().max(200),
    })
  )
  .handler(async ({ data }) => {
    const parent = await prisma.member.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        familyId: true,
        role: true,
        archived: true,
        passwordHash: true,
      },
    })
    const ok = await verifyPassword(data.password, parent?.passwordHash ?? null)
    if (!parent || !ok || parent.role !== "parent" || parent.archived) {
      return failSlowly()
    }
    await endSession()
    await startSession({
      kind: "family",
      familyId: parent.familyId,
      memberId: parent.id,
    })
  })

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await endSession()
})

/** Everyone who can play on this device. */
export const listProfiles = createServerFn({ method: "GET" }).handler(
  async () => {
    const viewer = await requireFamily()
    const members = await prisma.member.findMany({
      where: { familyId: viewer.familyId, archived: false },
      select: { id: true, name: true, color: true, emoji: true, role: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    })
    return { current: viewer.member.id, members }
  }
)

/**
 * Hands the device to someone else in the family. Anyone can switch to a
 * child; switching to a parent takes that parent's password.
 */
export const switchProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      memberId: z.string().min(1),
      password: z.string().max(200).optional(),
    })
  )
  .handler(async ({ data }) => {
    const viewer = await requireFamily()
    const target = await prisma.member.findFirst({
      where: { id: data.memberId, familyId: viewer.familyId, archived: false },
      select: { id: true, role: true, passwordHash: true },
    })
    if (!target) throw new Error("Den spiller findes ikke.")
    if (target.role === "parent" && target.id !== viewer.member.id) {
      const ok = await verifyPassword(data.password ?? "", target.passwordHash)
      if (!ok) return failSlowly()
    }
    await prisma.session.update({
      where: { id: viewer.sessionId },
      data: { memberId: target.id },
    })
    return { role: target.role }
  })

/** The site admin logs in with the username and password in .env. */
export const adminLogin = createServerFn({ method: "POST" })
  .validator(
    z.object({ username: z.string().max(200), password: z.string().max(200) })
  )
  .handler(async ({ data }) => {
    const username = process.env.ADMIN_USERNAME
    const password = process.env.ADMIN_PASSWORD
    if (!username || !password) {
      throw new Error("ADMIN_USERNAME og ADMIN_PASSWORD er ikke sat i .env.")
    }
    const ok =
      sameText(data.username, username) && sameText(data.password, password)
    if (!ok) return failSlowly()
    await endSession()
    await startSession({ kind: "admin" })
  })

export const adminLogout = createServerFn({ method: "POST" }).handler(
  async () => {
    await endSession()
  }
)
