import type * as React from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { CountUp } from "@/components/chores/game/celebrate"
import { levelOf } from "@/lib/progress"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { formatDay, today } from "@/lib/chores"
import { getLog } from "@/server/doubloons"
import { cn } from "@workspace/ui/lib/utils"

const PAGE = 100

export const Route = createFileRoute("/togt/log")({
  head: () => ({ meta: [{ title: "Logbogen · Tjansetogt" }] }),
  validateSearch: z.object({
    member: z.string().optional(),
    take: z.number().int().min(PAGE).max(1000).optional(),
  }),
  // Only parents keep the books.
  beforeLoad: ({ context }) => {
    if (!context.viewer.isParent) throw redirect({ to: "/togt" })
  },
  loaderDeps: ({ search }) => ({ member: search.member, take: search.take }),
  loader: ({ deps }) =>
    getLog({ data: { memberId: deps.member, take: deps.take ?? PAGE } }),
  component: ShipsLog,
})

type Entry = Awaited<ReturnType<typeof getLog>>["entries"][number]

const count = new Intl.NumberFormat("da-DK")

const KIND = {
  reward: {
    icon: <GoldCoin className="tg-coin" />,
    verb: (note: string) => `klarede ${note}`,
  },
  penalty: {
    icon: "💀",
    verb: (note: string) => `“${note}” blev ladt i stikken`,
  },
  purchase: { icon: "💎", verb: (note: string) => `indløste ${note}` },
} as const

function ShipsLog() {
  const { entries, hasMore, chest, crew } = Route.useLoaderData()
  const { member, take } = Route.useSearch()
  const on = today()

  // Entries grouped by day, newest first.
  const days: Array<{ date: string; entries: Array<Entry> }> = []
  for (const entry of entries) {
    const last = days.at(-1)
    if (last?.date === entry.date) last.entries.push(entry)
    else days.push({ date: entry.date, entries: [entry] })
  }

  return (
    <>
      <div className="tg-sec-h">
        <h2 style={{ fontSize: 34 }}>Logbogen</h2>
        <span>Hver dublon tjent, tabt og indløst</span>
      </div>

      <article className="tg-panel tg-hero">
        <div className="tg-hero-row">
          <div className="tg-ava">
            <span aria-hidden>💰</span>
          </div>
          <div>
            <div className="tg-hero-title">Hele familien</div>
            <h3 className="tg-hero-name">Fælleskisten</h3>
          </div>
          <div className="tg-hero-gain">
            <div className="tg-disp tg-num">
              <GoldCoin className="tg-coin" />{" "}
              <CountUp value={chest.earned - chest.lost - chest.spent} />
            </div>
          </div>
        </div>
        <dl className="tg-stats">
          <div className="tg-stat">
            <dt>Tjent</dt>
            <dd className="tg-num">
              {chest.earned > 0 ? `+${count.format(chest.earned)}` : 0}
            </dd>
          </div>
          <div className="tg-stat">
            <dt>Tabt</dt>
            <dd className="tg-num" style={{ color: "var(--accent)" }}>
              {chest.lost > 0 ? `−${count.format(chest.lost)}` : 0}
            </dd>
          </div>
          <div className="tg-stat">
            <dt>Indløst</dt>
            <dd className="tg-num">
              {chest.spent > 0 ? `−${count.format(chest.spent)}` : 0}
            </dd>
          </div>
        </dl>
      </article>

      {crew.length > 0 && (
        <div className="tg-crew">
          {crew.map((m) => (
            <article
              key={m.id}
              className="tg-panel tg-hero"
              style={{ "--mc": m.color } as React.CSSProperties}
            >
              <div className="tg-hero-row">
                <div className="tg-ava">
                  <span aria-hidden>{m.emoji}</span>
                  <span className="tg-lv">LV {levelOf(m.earned)}</span>
                </div>
                <div>
                  <div className="tg-hero-title">Har bidraget med</div>
                  <h3 className="tg-hero-name">{m.name}</h3>
                </div>
                <div className="tg-hero-gain">
                  <div className="tg-disp tg-num">
                    <GoldCoin className="tg-coin" />{" "}
                    <CountUp value={m.earned} />
                  </div>
                  <small>
                    {m.chores} {m.chores === 1 ? "tjans" : "tjanser"}
                  </small>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <nav aria-label="Filtrér efter spiller" className="tg-filters">
        <Link
          to="/togt/log"
          search={{}}
          className="tg-chip is-plain"
          aria-current={!member ? "page" : undefined}
        >
          Alle
        </Link>
        {crew.map((m) => (
          <Link
            key={m.id}
            to="/togt/log"
            search={{ member: m.id }}
            className="tg-chip"
            aria-current={member === m.id ? "page" : undefined}
            style={{ "--mc": m.color } as React.CSSProperties}
          >
            <em aria-hidden>{m.emoji}</em>
            {m.name}
          </Link>
        ))}
      </nav>

      <section className="tg-panel tg-log" aria-label="Logbogens linjer">
        {days.length === 0 ? (
          <div className="tg-empty">
            <b aria-hidden>📜</b>
            Logbogen er tom. Klar en tjans for at skrive den første linje.
          </div>
        ) : (
          days.map((day) => (
            <div key={day.date}>
              <h3>{formatDay(day.date, on)}</h3>
              <ol>
                {day.entries.map((entry, index) => (
                  <LogLine key={entry.id} entry={entry} index={index} />
                ))}
              </ol>
            </div>
          ))
        )}
        {hasMore && (
          <Link
            to="/togt/log"
            search={{ member, take: (take ?? PAGE) + PAGE }}
            resetScroll={false}
            className="tg-btn"
            style={{ alignSelf: "center" }}
          >
            Vis ældre
          </Link>
        )}
      </section>
    </>
  )
}

function LogLine({ entry, index }: { entry: Entry; index: number }) {
  const kind = KIND[entry.kind]
  const amountClass =
    entry.kind === "purchase"
      ? "is-spent"
      : entry.amount < 0
        ? "is-minus"
        : undefined
  return (
    <li
      className="tg-line"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <span aria-hidden className={`tg-kind is-${entry.kind}`}>
        {kind.icon}
      </span>
      {entry.member ? (
        <span
          aria-hidden
          className="tg-kind"
          style={{ background: entry.member.color, borderColor: "transparent" }}
        >
          {entry.member.emoji}
        </span>
      ) : (
        <span aria-hidden className="tg-kind">
          💰
        </span>
      )}
      <p>
        <b>{entry.member?.name ?? "Kisten"}</b>{" "}
        <span>{kind.verb(entry.note)}</span>
      </p>
      <time>{entry.time}</time>
      <span className={cn("tg-amount tg-num", amountClass)}>
        {entry.amount < 0 ? "−" : "+"}
        {count.format(Math.abs(entry.amount))}
      </span>
    </li>
  )
}
