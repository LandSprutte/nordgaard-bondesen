import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import { promisify } from "node:util"
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server"
import { prisma } from "@workspace/db"

// Server-only. Import this from inside server function handlers only: a plain
// export that uses prisma would otherwise end up in the client bundle.

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  length: number
) => Promise<Buffer>

const COOKIE = "togt_session"
const FAMILY_DAYS = 180
const ADMIN_HOURS = 12

/* ------------------------------------------------------------------ */
/* Passwords                                                           */

/** "scrypt$<salt>$<hash>", both hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

export async function verifyPassword(
  password: string,
  stored: string | null
): Promise<boolean> {
  const [scheme, salt, hash] = (stored ?? "").split("$")
  if (scheme !== "scrypt" || !salt || !hash) {
    // Same work either way, so a missing account takes as long as a wrong password.
    await scrypt(password, randomBytes(16), 64)
    return false
  }
  const expected = Buffer.from(hash, "hex")
  const actual = await scrypt(password, Buffer.from(salt, "hex"), 64)
  return timingSafeEqual(expected, actual)
}

/** Compares two strings without leaking where they differ. */
export function sameText(a: string, b: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest()
  return timingSafeEqual(digest(a), digest(b))
}

/** Makes guessing passwords slow. */
export function failSlowly(): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Forkert login. Prøv igen.")),
      600 + Math.random() * 400
    )
  )
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex")

export async function startSession(
  session:
    { kind: "admin" } | { kind: "family"; familyId: string; memberId: string }
) {
  const token = randomBytes(32).toString("base64url")
  const seconds =
    session.kind === "admin" ? ADMIN_HOURS * 3600 : FAMILY_DAYS * 86_400
  await prisma.session.create({
    data: {
      id: hashToken(token),
      ...session,
      expiresAt: new Date(Date.now() + seconds * 1000),
    },
  })
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: seconds,
  })
}

export async function endSession() {
  const token = getCookie(COOKIE)
  if (token) {
    await prisma.session.deleteMany({ where: { id: hashToken(token) } })
  }
  deleteCookie(COOKIE, { path: "/" })
}

const viewerMember = {
  id: true,
  name: true,
  color: true,
  emoji: true,
  role: true,
  plan: true,
  email: true,
  archived: true,
} as const

/** The browser's session, if it has a live one. */
export async function currentSession() {
  const token = getCookie(COOKIE)
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      family: { select: { id: true, name: true } },
      member: { select: viewerMember },
    },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }
  return session
}

export type Viewer = {
  sessionId: string
  family: { id: string; name: string }
  familyId: string
  member: {
    id: string
    name: string
    color: string
    emoji: string
    role: "parent" | "child"
    plan: "basic" | "pro"
    email: string | null
    archived: boolean
  }
  isParent: boolean
  /** A parent on the pro plan: may use the overview, budget and calendar. */
  isPro: boolean
}

/** Whoever is using the device, in their family. */
export async function viewerOf(
  session: Awaited<ReturnType<typeof currentSession>>
): Promise<Viewer | null> {
  if (session?.kind !== "family" || !session.family || !session.member) {
    return null
  }
  if (session.member.archived) {
    // They've left the family; a parent has to log in again.
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }
  return {
    sessionId: session.id,
    family: session.family,
    familyId: session.family.id,
    member: session.member,
    isParent: session.member.role === "parent",
    isPro: session.member.role === "parent" && session.member.plan === "pro",
  }
}

export class AuthError extends Error {}

/** Anyone logged in to a family. */
export async function requireFamily(): Promise<Viewer> {
  const viewer = await viewerOf(await currentSession())
  if (!viewer) throw new AuthError("Du er ikke logget ind.")
  return viewer
}

/** A parent, for everything outside the game. */
export async function requireParent(): Promise<Viewer> {
  const viewer = await requireFamily()
  if (!viewer.isParent) throw new AuthError("Det må kun en forælder.")
  return viewer
}

/** A pro parent, for the overview, budget and calendar. */
export async function requirePro(): Promise<Viewer> {
  const viewer = await requireParent()
  if (!viewer.isPro) throw new AuthError("Det kræver Pro.")
  return viewer
}

export async function requireAdmin() {
  const session = await currentSession()
  if (session?.kind !== "admin") throw new AuthError("Kun for admin.")
  return session
}
