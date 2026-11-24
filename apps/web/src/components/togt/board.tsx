import * as React from "react"

import type { Member } from "@/components/chores/member-avatar"
import type { VoyageTheme } from "@/components/chores/game/themes"
import { CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { addDays } from "@/lib/chores"
import { cn } from "@workspace/ui/lib/utils"

/** Experience needed per member level, and per crew level. */
export const MEMBER_LEVEL_XP = 250
export const TEAM_LEVEL_XP = 1000

export const levelOf = (xp: number) => Math.floor(xp / MEMBER_LEVEL_XP) + 1

const count = new Intl.NumberFormat("da-DK")

export function Hud({
  theme,
  teamXp,
  streak,
  coins,
  walletRef,
}: {
  theme: VoyageTheme
  teamXp: number
  streak: number
  coins: number
  walletRef: React.Ref<HTMLDivElement>
}) {
  const level = Math.floor(teamXp / TEAM_LEVEL_XP) + 1
  const into = teamXp % TEAM_LEVEL_XP
  return (
    <section className="tg-hud" aria-label="Holdets status">
      <div className="tg-lvl">
        <div>
          <small>HOLD</small>
          {level}
        </div>
      </div>
      <div className="tg-xp">
        <div className="tg-xp-top">
          <span>{theme.teamLevel}</span>
          <span className="tg-num">
            {count.format(into)} / {count.format(TEAM_LEVEL_XP)} XP
          </span>
        </div>
        <div className="tg-xp-bar">
          <i style={{ width: `${(into / TEAM_LEVEL_XP) * 100}%` }} />
        </div>
      </div>
      <div className="tg-hud-chip">
        <span aria-hidden className="tg-ico">
          🔥
        </span>
        <div>
          <div className="tg-big tg-num">{streak}</div>
          <span>{streak === 1 ? "DAG I TRÆK" : "DAGE I TRÆK"}</span>
        </div>
      </div>
      <div className="tg-hud-chip tg-wallet" ref={walletRef}>
        <GoldCoin className="tg-coin" />
        <div>
          <div className="tg-big tg-num">
            <CountUp value={coins} />
          </div>
          <span>DUBLONER I ALT</span>
        </div>
      </div>
    </section>
  )
}

/** Time left until the week ends (Sunday at midnight), ticking. */
function useCountdown(week: string) {
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  if (now === null) return "–"
  const end = new Date(`${addDays(week, 7)}T00:00:00`).getTime()
  const ms = Math.max(0, end - now)
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${d}d ${String(h).padStart(2, "0")}t ${String(m).padStart(2, "0")}m`
}

/** The Sunday penalty as a boss: each finished chore takes a life. */
export function Boss({
  theme,
  week,
  chores,
  hit,
}: {
  theme: VoyageTheme
  week: string
  chores: Array<{ id: string; title: string; done: boolean }>
  /** Goes up each time the boss takes a hit. */
  hit: number
}) {
  const countdown = useCountdown(week)
  const face = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = face.current
    if (!hit || !el) return
    el.classList.remove("is-hit")
    void el.offsetWidth
    el.classList.add("is-hit")
  }, [hit])

  const left = chores.filter((c) => !c.done).length
  const defeated = chores.length > 0 && left === 0
  return (
    <section
      className={cn("tg-panel tg-boss", defeated && "is-defeated")}
      aria-label="Ugens boss"
    >
      <div ref={face} aria-hidden className="tg-boss-face">
        {theme.boss.face}
      </div>
      <div>
        <p className="tg-eyebrow" style={{ color: "var(--accent)" }}>
          Ugens boss
        </p>
        <h3 className="tg-boss-name">
          {defeated ? `${theme.boss.name} er besejret!` : theme.boss.name}
        </h3>
        <p className="tg-boss-meta">
          {defeated
            ? "Ingen dubloner går tabt i denne uge."
            : chores.length === 0
              ? "Venter på ugens tjanser."
              : theme.boss.meta}
        </p>
        {chores.length > 0 && (
          <div
            className="tg-hp"
            role="img"
            aria-label={`${left} af ${chores.length} liv tilbage`}
          >
            {chores.map((c) => (
              <i
                key={c.id}
                title={c.title}
                className={c.done ? "is-gone" : undefined}
              />
            ))}
          </div>
        )}
      </div>
      <div className="tg-countdown">
        <div className="tg-disp tg-num">{countdown}</div>
        <small>Til angrebet</small>
      </div>
    </section>
  )
}

/** What the boss took last week, while it's still news. */
export function BossStruck({
  theme,
  undone,
  lost,
}: {
  theme: VoyageTheme
  undone: Array<string>
  lost: Array<{ member: Member; amount: number }>
}) {
  return (
    <section className="tg-panel tg-boss" role="note">
      <div aria-hidden className="tg-boss-face">
        💀
      </div>
      <div style={{ gridColumn: "span 2" }}>
        <p className="tg-eyebrow" style={{ color: "var(--accent)" }}>
          Sidste uge
        </p>
        <h3 className="tg-boss-name">{theme.boss.name} slog til!</h3>
        <p className="tg-boss-meta">
          {undone.length === 1 ? "Én tjans" : `${undone.length} tjanser`} blev
          ladt i stikken: {undone.join(", ")}.
        </p>
        {lost.length > 0 && (
          <ul className="tg-struck">
            {lost.map(({ member, amount }) => (
              <li
                key={member.id}
                style={{ "--mc": member.color } as React.CSSProperties}
              >
                <em aria-hidden>{member.emoji}</em>
                {member.name}
                <b className="tg-num">−{count.format(amount)}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export type Hero = Member & {
  xp: number
  balance: number
  /** Earned this week. */
  gain: number
  /** Chores finished this week. */
  chores: number
}

export function HeroCard({
  hero,
  theme,
  top,
}: {
  hero: Hero
  theme: VoyageTheme
  /** Earned the most this week. */
  top: boolean
}) {
  const level = levelOf(hero.xp)
  const title = theme.levelTitles[level >= 7 ? 2 : level >= 4 ? 1 : 0]
  const into = hero.xp % MEMBER_LEVEL_XP
  return (
    <article
      className={cn("tg-panel tg-hero", top && "is-top")}
      style={{ "--mc": hero.color } as React.CSSProperties}
    >
      <div className="tg-hero-row">
        <div className="tg-ava">
          {top && (
            <span aria-hidden className="tg-crown">
              👑
            </span>
          )}
          <span aria-hidden>{hero.emoji}</span>
          <span className="tg-lv">LV {level}</span>
        </div>
        <div>
          <div className="tg-hero-title">
            {top && `${theme.captain} · `}
            {title}
          </div>
          <h3 className="tg-hero-name">{hero.name}</h3>
        </div>
        <div className="tg-hero-gain">
          <div className="tg-disp tg-num">
            +<CountUp value={hero.gain} />
          </div>
          <small>Denne uge</small>
        </div>
      </div>
      <div className="tg-mini-xp">
        <i style={{ width: `${(into / MEMBER_LEVEL_XP) * 100}%` }} />
      </div>
      <div className="tg-mini-xp-l">
        <span>XP</span>
        <span className="tg-num">
          {into}/{MEMBER_LEVEL_XP} til LV {level + 1}
        </span>
      </div>
      <dl className="tg-stats">
        <div className="tg-stat">
          <dt>Tjanser</dt>
          <dd className="tg-num">{hero.chores}</dd>
        </div>
        <div className="tg-stat">
          <dt>I pungen</dt>
          <dd className="tg-num">
            <GoldCoin className="tg-coin" />
            <CountUp value={hero.balance} />
          </dd>
        </div>
        <div className="tg-stat">
          <dt>XP i alt</dt>
          <dd className="tg-num">{count.format(hero.xp)}</dd>
        </div>
      </dl>
    </article>
  )
}

export function Badges({
  theme,
  earned,
}: {
  theme: VoyageTheme
  earned: [boolean, boolean, boolean, boolean]
}) {
  return (
    <ul className="tg-badges">
      {theme.badges.map(([emoji, name, how], i) => (
        <li
          key={name}
          className={cn(
            "tg-panel tg-badge",
            earned[i] ? "is-earned" : "is-locked"
          )}
        >
          <div aria-hidden className="tg-b-ico">
            {earned[i] ? emoji : "🔒"}
          </div>
          <b>{name}</b>
          <small>{earned[i] ? "Låst op!" : how}</small>
        </li>
      ))}
    </ul>
  )
}
