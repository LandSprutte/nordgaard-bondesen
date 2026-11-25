import * as React from "react"
import { Link } from "@tanstack/react-router"

import type { Member } from "@/components/chores/member-avatar"
import type { VoyageTheme } from "@/components/chores/game/themes"
import { CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { treasureIcon } from "@/components/chores/game/treasure-icon"
import { MEMBER_LEVEL_XP, levelOf, titleIndex } from "@/lib/progress"
import { cn } from "@workspace/ui/lib/utils"

/** Experience needed per crew level. */
export const TEAM_LEVEL_XP = 1000

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
          <span>I FÆLLESKISTEN</span>
        </div>
      </div>
    </section>
  )
}

export type Hero = Member & {
  xp: number
  /** Earned this week. */
  gain: number
  /** Chores finished this week. */
  chores: number
}

/**
 * The crew as avatars in the corner of the stage: a ring fills with
 * experience towards the next level. Each one opens that player's profile.
 */
export function CrewAvatars({
  heroes,
  theme,
  best,
}: {
  heroes: Array<Hero>
  theme: VoyageTheme
  /** Most earned by anyone this week; they wear the crown. */
  best: number
}) {
  if (heroes.length === 0) return null
  return (
    <ul className="tg-stage-crew" aria-label={theme.crewTitle}>
      {heroes.map((hero) => {
        const level = levelOf(hero.xp)
        const into = hero.xp % MEMBER_LEVEL_XP
        const top = best > 0 && hero.gain === best
        const title = theme.levelTitles[titleIndex(level)]
        return (
          <li key={hero.id}>
            <Link
              to="/togt/profil"
              search={{ member: hero.id }}
              className={cn("tg-crew-ava", top && "is-top")}
              title={`${hero.name} · LV ${level} ${title} · +${hero.gain} denne uge`}
              style={
                {
                  "--mc": hero.color,
                  "--xp": into / MEMBER_LEVEL_XP,
                } as React.CSSProperties
              }
            >
              {top && (
                <span aria-hidden className="tg-crown">
                  👑
                </span>
              )}
              <span aria-hidden className="tg-crew-face">
                {hero.emoji}
              </span>
              <span aria-hidden className="tg-lv">
                LV {level}
              </span>
              <span className="sr-only">
                {hero.name}, niveau {level}
                {top ? `, ${theme.captain}` : ""}. Se profil.
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** The treasure the whole family is saving up for together. */
export function Goal({
  goal,
  balance,
  ready,
}: {
  goal: { title: string; cost: number } | null
  balance: number
  /** Treasures the chest can afford right now. */
  ready: number
}) {
  if (!goal) {
    return (
      <Link to="/togt/skat" className="tg-panel tg-goal">
        <span aria-hidden className="tg-goal-ico">
          🎯
        </span>
        <div>
          <p className="tg-eyebrow">Fælles mål</p>
          <h3>Ingen skatte endnu</h3>
          <small>
            En voksen kan lægge skatte i kisten, I kan spare op til.
          </small>
        </div>
      </Link>
    )
  }
  const reached = balance >= goal.cost
  return (
    <Link
      to="/togt/skat"
      className={cn("tg-panel tg-goal", reached && "is-reached")}
    >
      <span aria-hidden className="tg-goal-ico">
        {treasureIcon(goal.title)}
      </span>
      <div>
        <p className="tg-eyebrow">Fælles mål</p>
        <h3>{goal.title}</h3>
        <div
          className="tg-goal-bar"
          role="img"
          aria-label={`${count.format(Math.min(balance, goal.cost))} af ${count.format(goal.cost)} dubloner`}
        >
          <i style={{ width: `${Math.min(1, balance / goal.cost) * 100}%` }} />
        </div>
        <small className="tg-num">
          {reached
            ? "Klar! Hent en voksen i Skattekisten."
            : `${count.format(balance)} / ${count.format(goal.cost)} · mangler ${count.format(goal.cost - balance)}`}
          {ready > 0 &&
            !reached &&
            ` · ${ready} ${ready === 1 ? "skat" : "skatte"} klar`}
        </small>
      </div>
    </Link>
  )
}
