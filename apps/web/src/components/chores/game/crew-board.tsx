import { CrownIcon } from "lucide-react"

import { GoldCoin } from "@/components/chores/game/gold-coin"
import type { Member } from "@/components/chores/member-avatar"
import { CountUp } from "@/components/chores/game/celebrate"
import { MemberAvatar } from "@/components/chores/member-avatar"
import { cn } from "@workspace/ui/lib/utils"
import { useVoyageTheme } from "@/components/chores/game/themes"

const MEDALS = ["🥇", "🥈", "🥉"]

export type CrewStanding = Member & {
  /** Doubloons earned this week. */
  earned: number
  /** All doubloons in their purse. */
  balance: number
  /** Chores they finished this week. */
  chores: number
}

/** This week's leaderboard. Whoever earned the most is captain. */
export function CrewBoard({ crew }: { crew: Array<CrewStanding> }) {
  const ranked = [...crew].sort(
    (a, b) => b.earned - a.earned || a.name.localeCompare(b.name)
  )
  const top = ranked[0]?.earned ?? 0
  const theme = useVoyageTheme()

  return (
    <section aria-labelledby="crew-heading" className="flex flex-col gap-3">
      <h2 id="crew-heading" className="text-lg font-black tracking-tight">
        {theme.crewTitle}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ranked.map((member, index) => {
          const captain = top > 0 && member.earned === top
          const medal = member.earned > 0 ? MEDALS[index] : undefined
          return (
            <li
              key={member.id}
              className={cn(
                "game-rise relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 shadow-sm transition-transform hover:-translate-y-0.5",
                captain && "game-glow border-amber-400"
              )}
              style={{
                animationDelay: `${index * 70}ms`,
                borderColor: captain
                  ? undefined
                  : `color-mix(in oklab, ${member.color} 45%, transparent)`,
                backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${member.color} 26%, var(--card)) 0%, var(--card) 75%)`,
              }}
            >
              <div className="relative">
                <MemberAvatar member={member} size="lg" />
                {captain && (
                  <CrownIcon
                    aria-label={`Ugens ${theme.captain.toLowerCase()}`}
                    className="game-bob absolute -top-4 left-1/2 size-6 -translate-x-1/2 fill-amber-400 text-amber-600 drop-shadow"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1 truncate font-bold">
                  {member.name}
                  {medal && <span aria-hidden>{medal}</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {captain ? `${theme.captain} · ` : ""}
                  {member.chores} {member.chores === 1 ? "tjans" : "tjanser"} ·
                  <GoldCoin /> <CountUp value={member.balance} /> i pungen
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl leading-none font-black text-amber-500 tabular-nums drop-shadow-sm dark:text-amber-400">
                  +<CountUp value={member.earned} />
                </span>
                <span className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  dette togt
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
