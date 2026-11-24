import { Link, createFileRoute } from "@tanstack/react-router"
import { GemIcon, ScrollTextIcon, SkullIcon } from "lucide-react"
import { z } from "zod"

import { PageHeader } from "@/components/budget/page-header"
import { DoubloonChange } from "@/components/chores/doubloons"
import { CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { MemberAvatar } from "@/components/chores/member-avatar"
import { formatDay, today } from "@/lib/chores"
import { getLog } from "@/server/doubloons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const PAGE = 100

export const Route = createFileRoute("/_dashboard/chores/log")({
  staticData: { title: "Logbogen" },
  validateSearch: z.object({
    member: z.string().optional(),
    take: z.number().int().min(PAGE).max(1000).optional(),
  }),
  loaderDeps: ({ search }) => ({ member: search.member, take: search.take }),
  loader: ({ deps }) =>
    getLog({ data: { memberId: deps.member, take: deps.take ?? PAGE } }),
  component: ShipsLog,
})

type Log = Awaited<ReturnType<typeof getLog>>
type Entry = Log["entries"][number]

const KIND = {
  reward: {
    icon: <GoldCoin className="size-5" />,
    bubble:
      "bg-amber-100 ring-amber-300 dark:bg-amber-500/15 dark:ring-amber-500/40",
    verb: (note: string) => <>klarede {note}</>,
  },
  penalty: {
    icon: (
      <SkullIcon className="game-wobble size-5 text-red-600 dark:text-red-400" />
    ),
    bubble: "bg-red-100 ring-red-300 dark:bg-red-500/15 dark:ring-red-500/40",
    verb: (note: string) => <>betalte for “{note}”, der blev ladt i stikken</>,
  },
  purchase: {
    icon: <GemIcon className="size-5 text-violet-600 dark:text-violet-400" />,
    bubble:
      "bg-violet-100 ring-violet-300 dark:bg-violet-500/15 dark:ring-violet-500/40",
    verb: (note: string) => <>plyndrede {note}</>,
  },
} as const

function ShipsLog() {
  const { entries, hasMore, crew } = Route.useLoaderData()
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
    <div className="flex max-w-4xl flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Logbogen"
        description="Hver dublon besætningen har tjent, tabt og brugt."
      />

      {crew.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {crew.map((m, index) => (
            <li
              key={m.id}
              className="game-rise flex flex-col gap-3 rounded-3xl border-2 p-4 shadow-sm"
              style={{
                animationDelay: `${index * 60}ms`,
                borderColor: `color-mix(in oklab, ${m.color} 45%, transparent)`,
                backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${m.color} 22%, var(--card)) 0%, var(--card) 75%)`,
              }}
            >
              <div className="flex items-center gap-3">
                <MemberAvatar member={m} size="lg" />
                <div className="flex flex-1 flex-col">
                  <span className="font-bold">{m.name}</span>
                  <span className="flex items-center gap-1 text-xl font-black tabular-nums">
                    <GoldCoin />
                    <CountUp value={m.earned - m.lost - m.spent} />
                  </span>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <Tally
                  label="Tjent"
                  className="text-amber-700 dark:text-amber-400"
                >
                  {m.earned > 0 ? `+${m.earned}` : 0}
                </Tally>
                <Tally label="Tabt" className="text-red-600 dark:text-red-400">
                  {m.lost > 0 ? `−${m.lost}` : 0}
                </Tally>
                <Tally
                  label="Brugt"
                  className="text-violet-600 dark:text-violet-400"
                >
                  {m.spent > 0 ? `−${m.spent}` : 0}
                </Tally>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Filtrér efter pirat" className="flex flex-wrap gap-2">
        <FilterChip active={!member} search={{}}>
          Hele besætningen
        </FilterChip>
        {crew.map((m) => (
          <FilterChip
            key={m.id}
            active={member === m.id}
            search={{ member: m.id }}
          >
            <MemberAvatar member={m} size="sm" className="ring-0" />
            {m.name}
          </FilterChip>
        ))}
      </nav>

      <section
        aria-label="Logbogens linjer"
        className="game-rise flex flex-col gap-5 rounded-3xl border-2 border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] p-5 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-[linear-gradient(180deg,#1c1407_0%,#2a1d0a_100%)] dark:text-amber-50"
      >
        {days.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ScrollTextIcon className="size-10 opacity-50" />
            <p className="font-bold">Logbogen er tom</p>
            <p className="text-sm opacity-70">
              Klar en tjans for at skrive den første linje.
            </p>
          </div>
        ) : (
          days.map((day) => (
            <div key={day.date} className="flex flex-col gap-2">
              <h2 className="text-xs font-black tracking-[0.18em] uppercase opacity-60">
                {formatDay(day.date, on)}
              </h2>
              <ol className="flex flex-col gap-1.5">
                {day.entries.map((entry, index) => (
                  <LogLine key={entry.id} entry={entry} index={index} />
                ))}
              </ol>
            </div>
          ))
        )}
        {hasMore && (
          <Button
            variant="outline"
            className="self-center"
            nativeButton={false}
            render={
              <Link
                to="/chores/log"
                search={{ member, take: (take ?? PAGE) + PAGE }}
                resetScroll={false}
              />
            }
          >
            Vis ældre
          </Button>
        )}
      </section>
    </div>
  )
}

function Tally({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-background/60 px-1 py-1.5">
      <dd className={cn("text-base font-black tabular-nums", className)}>
        {children}
      </dd>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
    </div>
  )
}

function FilterChip({
  active,
  search,
  children,
}: {
  active: boolean
  search: { member?: string }
  children: React.ReactNode
}) {
  return (
    <Link
      to="/chores/log"
      search={search}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors",
        active
          ? "border-amber-500 bg-amber-400 text-amber-950"
          : "border-border bg-card hover:bg-muted"
      )}
    >
      {children}
    </Link>
  )
}

function LogLine({ entry, index }: { entry: Entry; index: number }) {
  const kind = KIND[entry.kind]
  return (
    <li
      className="game-rise flex items-center gap-3 rounded-2xl bg-white/50 p-2 pr-3 dark:bg-white/5"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full ring-2",
          kind.bubble
        )}
      >
        {kind.icon}
      </span>
      <MemberAvatar member={entry.member} size="sm" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-bold">{entry.member.name}</span>{" "}
        <span className="opacity-75">{kind.verb(entry.note)}</span>
      </p>
      <span className="text-xs tabular-nums opacity-60">{entry.time}</span>
      <DoubloonChange
        amount={entry.amount}
        kind={entry.kind}
        className="w-14 justify-end"
      />
    </li>
  )
}
