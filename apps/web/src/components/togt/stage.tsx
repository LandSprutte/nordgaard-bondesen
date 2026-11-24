import type * as React from "react"

import type { Member } from "@/components/chores/member-avatar"
import type { ThemeId, VoyageTheme } from "@/components/chores/game/themes"
import type { SceneProps } from "@/components/chores/game/voyage-scenes"
import { CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import {
  CityScene,
  FieldScene,
  LakeScene,
  SeaScene,
} from "@/components/chores/game/voyage-scenes"
import { addDays, daysLeft, formatWeek, weekNumber } from "@/lib/chores"
import { cn } from "@workspace/ui/lib/utils"

const SCENES: Record<ThemeId, (props: SceneProps) => React.ReactNode> = {
  pirat: SeaScene,
  traktor: FieldScene,
  spindelhelt: CityScene,
  wakeboard: LakeScene,
}

const DAY_LETTERS = ["M", "T", "O", "T", "F", "L", "S"]

/**
 * The week as a level: the hero travels towards the treasure as chores get
 * done, over a bar coloured by who did them.
 */
export function Stage({
  theme,
  week,
  today,
  total,
  done,
  doneDays,
  upForGrabs,
  pow,
}: {
  theme: VoyageTheme
  week: string
  today: string
  total: number
  /** Finished chores per member. */
  done: Array<{ member: Member; count: number }>
  /** Days this week with at least one chore finished. */
  doneDays: Set<string>
  upForGrabs: number
  /** A comic word to pop up over the hero, with a key to replay it. */
  pow: { key: number; word: string } | null
}) {
  const finished = done.reduce((sum, d) => sum + d.count, 0)
  const share = total === 0 ? 0 : finished / total
  const arrived = total > 0 && finished === total
  const left = daysLeft(week, today)
  const Scene = SCENES[theme.id]
  const scorers = done.filter((d) => d.count > 0)
  const headline = arrived
    ? "Fri plyndring!"
    : total === 0
      ? theme.headline.empty
      : finished === 0
        ? theme.headline.start
        : share >= 0.5
          ? theme.headline.halfway
          : theme.headline.underway

  return (
    <section className="tg-stage" aria-label="Ugens togt">
      <div className="tg-stage-head">
        <p className="tg-eyebrow">
          Uge {weekNumber(week)} · {formatWeek(week)} · {theme.weekName}
        </p>
        <h2>{headline}</h2>
        <p className="tg-stage-sub">
          {arrived ? theme.arrivedText : theme.warning}
        </p>
        <ol className="tg-days" aria-label="Ugens dage">
          {DAY_LETTERS.map((letter, i) => {
            const date = addDays(week, i)
            return (
              <li
                key={date}
                aria-current={date === today ? "date" : undefined}
                className={cn(
                  "tg-day",
                  date < today && "is-past",
                  date === today && "is-today"
                )}
              >
                {letter}
                {doneDays.has(date) && (
                  <span className="tg-tick" aria-label="tjanser klaret">
                    ✓
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="tg-scene">
        <Scene share={share} arrived={arrived} goal={theme.goal} />
        {pow && (
          <span
            key={pow.key}
            aria-hidden
            className="tg-pow"
            style={{
              left: `calc(24px + 1.5rem + ${share} * (100% - 48px - 9.5rem))`,
            }}
          >
            {pow.word}
          </span>
        )}
        {arrived && (
          <div aria-hidden className="tg-plunder">
            FRI PLYNDRING!
          </div>
        )}
      </div>

      <div className="tg-stage-foot">
        <div
          className="tg-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={finished}
          aria-label={`${finished} af ${total} tjanser klaret`}
        >
          {total > 0 &&
            scorers.map(({ member, count }) => (
              <i
                key={member.id}
                title={`${member.name}: ${count}`}
                style={{
                  width: `${(count / total) * 100}%`,
                  background: member.color,
                }}
              />
            ))}
        </div>
        <ul className="tg-legend">
          {scorers.length === 0 ? (
            <li>Ingen tjanser klaret endnu</li>
          ) : (
            scorers.map(({ member, count }) => (
              <li key={member.id}>
                <b style={{ background: member.color }} />
                {member.name} · {count}
              </li>
            ))
          )}
        </ul>
        <dl className="tg-tiles">
          <div className="tg-tile">
            <dt>{theme.doneLabel}</dt>
            <dd className="tg-num">
              <CountUp value={finished} />/{total}
            </dd>
          </div>
          <div className="tg-tile">
            <dt>Til fri plyndring</dt>
            <dd className="tg-num">
              <GoldCoin className="tg-coin" />
              <CountUp value={upForGrabs} />
            </dd>
          </div>
          <div className={cn("tg-tile", left <= 2 && !arrived && "is-warn")}>
            <dt>{left === 1 ? "Sidste dag!" : "Dage tilbage"}</dt>
            <dd className="tg-num">⏳ {left}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
