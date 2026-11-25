import type * as React from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { useVoyageTheme } from "@/components/chores/game/themes"
import { CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { weekNumber } from "@/lib/chores"
import {
  MEMBER_LEVEL_XP,
  TITLE_LEVELS,
  levelOf,
  titleIndex,
} from "@/lib/progress"
import { getProfile } from "@/server/profile"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/togt/profil")({
  head: () => ({ meta: [{ title: "Profil · Tjansetogt" }] }),
  validateSearch: z.object({ member: z.string().optional() }),
  loaderDeps: ({ search }) => ({ member: search.member }),
  loader: ({ deps }) => getProfile({ data: { memberId: deps.member } }),
  component: ProfilePage,
})

const count = new Intl.NumberFormat("da-DK")
const percent = new Intl.NumberFormat("da-DK", { style: "percent" })
const WEEKDAYS = [
  "mandag",
  "tirsdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lørdag",
  "søndag",
]

function ProfilePage() {
  const p = Route.useLoaderData()
  const theme = useVoyageTheme()
  const level = levelOf(p.xp)
  const into = p.xp % MEMBER_LEVEL_XP
  const title = theme.levelTitles[titleIndex(level)]
  const bestDay = Math.max(...p.perWeekday)
  const name = p.isMe ? "Du" : p.member.name

  return (
    <>
      <section
        className="tg-panel tg-profile-hero"
        style={{ "--mc": p.member.color } as React.CSSProperties}
        aria-label={`${p.member.name}s profil`}
      >
        <div
          className="tg-crew-ava tg-profile-ava"
          style={{ "--xp": into / MEMBER_LEVEL_XP } as React.CSSProperties}
        >
          <span aria-hidden className="tg-crew-face">
            {p.member.emoji}
          </span>
          <span aria-hidden className="tg-lv">
            LV {level}
          </span>
        </div>
        <div className="tg-profile-id">
          <p className="tg-eyebrow">
            {p.isMe ? "Din profil" : "Profil"}
            {p.member.isParent ? " · Forælder" : ""}
          </p>
          <h2>{p.member.name}</h2>
          <p className="tg-profile-title">
            LV {level} · {title}
          </p>
          <div
            className="tg-mini-xp"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={MEMBER_LEVEL_XP}
            aria-valuenow={into}
            aria-label={`XP til niveau ${level + 1}`}
          >
            <i style={{ width: `${(into / MEMBER_LEVEL_XP) * 100}%` }} />
          </div>
          <div className="tg-mini-xp-l">
            <span className="tg-num">
              {count.format(into)}/{MEMBER_LEVEL_XP} XP
            </span>
            <span>
              {count.format(MEMBER_LEVEL_XP - into)} til LV {level + 1}
            </span>
          </div>
        </div>
        <div className="tg-profile-xp">
          <div className="tg-disp tg-num">
            <CountUp value={p.xp} />
          </div>
          <small>XP i alt</small>
        </div>
      </section>

      {p.crew.length > 1 && (
        <nav aria-label="Vælg spiller" className="tg-filters">
          {p.crew.map((m) => (
            <Link
              key={m.id}
              to="/togt/profil"
              search={{ member: m.id }}
              className="tg-chip"
              aria-current={m.id === p.member.id ? "page" : undefined}
              style={{ "--mc": m.color } as React.CSSProperties}
            >
              <em aria-hidden>{m.emoji}</em>
              {m.name}
            </Link>
          ))}
        </nav>
      )}

      <dl className="tg-profile-stats">
        <Stat icon="⚔️" label="Tjanser i alt" value={count.format(p.chores)} />
        <Stat
          icon="📅"
          label="Denne uge"
          value={`+${count.format(p.thisWeek.xp)} XP`}
          note={`${p.thisWeek.chores} ${p.thisWeek.chores === 1 ? "tjans" : "tjanser"}`}
        />
        <Stat
          icon="🔥"
          label="Dage i træk"
          value={count.format(p.streak.current)}
          note={`Rekord: ${p.streak.best}`}
        />
        <Stat
          icon="💪"
          label="Største tjans"
          value={p.biggest ? `${count.format(p.biggest.xp)} XP` : "–"}
          note={p.biggest?.title}
        />
        <Stat
          icon={<GoldCoin className="tg-coin" />}
          label="Andel af kisten"
          value={percent.format(p.share)}
          note="af alt familien har tjent"
        />
        <Stat
          icon="🏆"
          label="Plads i familien"
          value={p.rank ? `#${p.rank}` : "–"}
          note={p.rank ? `ud af ${p.crewSize}` : undefined}
        />
        <Stat
          icon="⭐"
          label="Bedste dag"
          value={bestDay > 0 ? WEEKDAYS[p.perWeekday.indexOf(bestDay)] : "–"}
          note={bestDay > 0 ? `${bestDay} tjanser` : undefined}
        />
        <Stat
          icon="⚓"
          label="Første tjans"
          value={
            p.firstDate
              ? new Date(`${p.firstDate}T12:00:00`).toLocaleDateString(
                  "da-DK",
                  { day: "numeric", month: "short", year: "numeric" }
                )
              : "–"
          }
        />
      </dl>

      <section className="tg-panel tg-profile-box" aria-labelledby="weeks-h">
        <div className="tg-sec-h">
          <h2 id="weeks-h">De sidste uger</h2>
          <span>XP pr. uge</span>
        </div>
        <WeekBars weeks={p.weeks} color={p.member.color} />
      </section>

      <div className="tg-profile-cols">
        <section
          className="tg-panel tg-profile-box"
          aria-labelledby="ranks-h"
          style={{ "--mc": p.member.color } as React.CSSProperties}
        >
          <div className="tg-sec-h">
            <h2 id="ranks-h">Titler</h2>
          </div>
          <ol className="tg-ranks">
            {theme.levelTitles.map((rank, i) => {
              const from = TITLE_LEVELS[i]
              const reached = level >= from
              const current = titleIndex(level) === i
              const missing = (from - 1) * MEMBER_LEVEL_XP - p.xp
              return (
                <li
                  key={rank}
                  className={cn(
                    reached ? "is-reached" : "is-locked",
                    current && "is-current"
                  )}
                >
                  <span aria-hidden className="tg-rank-ico">
                    {reached ? (current ? "⭐" : "✓") : "🔒"}
                  </span>
                  <div>
                    <b>{rank}</b>
                    <small>
                      Fra LV {from}
                      {!reached && ` · mangler ${count.format(missing)} XP`}
                      {current && " · nu"}
                    </small>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="tg-panel tg-profile-box" aria-labelledby="fav-h">
          <div className="tg-sec-h">
            <h2 id="fav-h">Yndlingstjanser</h2>
          </div>
          {p.favourites.length === 0 ? (
            <p className="tg-profile-empty">
              {name} har ikke klaret nogen tjanser endnu.
            </p>
          ) : (
            <ol className="tg-favs">
              {p.favourites.map((f) => (
                <li key={f.title}>
                  <b>{f.title}</b>
                  <span className="tg-num">
                    {f.count}× · {count.format(f.xp)} XP
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}

function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="tg-panel tg-pstat">
      <dt>
        <span aria-hidden>{icon}</span>
        {label}
      </dt>
      <dd className="tg-num">{value}</dd>
      {note && <dd className="tg-pstat-note">{note}</dd>}
    </div>
  )
}

/** XP per week as bars in the player's colour; this week is labelled. */
function WeekBars({
  weeks,
  color,
}: {
  weeks: Array<{ week: string; xp: number; chores: number }>
  color: string
}) {
  const max = Math.max(1, ...weeks.map((w) => w.xp))
  return (
    <ol className="tg-bars" style={{ "--mc": color } as React.CSSProperties}>
      {weeks.map((w, i) => {
        const last = i === weeks.length - 1
        const text = `Uge ${weekNumber(w.week)}: ${count.format(w.xp)} XP, ${w.chores} ${w.chores === 1 ? "tjans" : "tjanser"}`
        return (
          <li key={w.week} className={cn(last && "is-now")} tabIndex={0}>
            <span className="sr-only">{text}</span>
            <span aria-hidden className="tg-bar-v tg-num">
              {count.format(w.xp)}
            </span>
            <span aria-hidden className="tg-bar-track">
              <i style={{ height: `${(w.xp / max) * 100}%` }} />
            </span>
            <span aria-hidden className="tg-bar-l">
              {last ? "Nu" : `U${weekNumber(w.week)}`}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
