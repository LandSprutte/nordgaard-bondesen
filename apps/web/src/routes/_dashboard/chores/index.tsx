import * as React from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarPlusIcon } from "lucide-react"

import { PageHeader } from "@/components/budget/page-header"
import { DoubloonChange } from "@/components/chores/doubloons"
import { Confetti } from "@/components/chores/game/celebrate"
import { CrewBoard } from "@/components/chores/game/crew-board"
import { ThemePicker } from "@/components/chores/game/theme-picker"
import { useVoyageTheme } from "@/components/chores/game/themes"
import { Voyage } from "@/components/chores/game/voyage"
import { MemberAvatar } from "@/components/chores/member-avatar"
import { WeekChoreCard } from "@/components/chores/week-chore-card"
import { getWeek } from "@/server/weeks"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/_dashboard/chores/")({
  staticData: { title: "Ugens togt" },
  loader: () => getWeek({ data: {} }),
  component: ThisWeek,
})

type Data = Awaited<ReturnType<typeof getWeek>>

function ThisWeek() {
  const data = Route.useLoaderData()
  const { chores, crew, week, today, editable } = data
  const active = crew.filter((m) => !m.archived)
  const theme = useVoyageTheme()
  const choresBy = (id: string) =>
    chores.filter((c) => c.doneBy?.id === id).length
  const finished = chores.filter((c) => c.doneBy).length
  const upForGrabs = chores
    .filter((c) => !c.doneBy)
    .reduce((sum, c) => sum + c.doubloons, 0)

  // Confetti when the last chore of the week gets done.
  const [confetti, setConfetti] = React.useState(0)
  const wasAllDone = React.useRef(finished === chores.length)
  React.useEffect(() => {
    const allDone = chores.length > 0 && finished === chores.length
    if (allDone && !wasAllDone.current) setConfetti((n) => n + 1)
    wasAllDone.current = allDone
  }, [finished, chores.length])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <Confetti play={confetti} />
      <PageHeader title="Ugens togt">
        <ThemePicker />
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/chores/plan" search={{ week: "next" }} />}
        >
          <CalendarPlusIcon data-icon="inline-start" />
          Planlæg næste togt
        </Button>
      </PageHeader>

      <Voyage
        week={week}
        today={today}
        total={chores.length}
        done={crew.map((member) => ({ member, count: choresBy(member.id) }))}
        upForGrabs={upForGrabs}
      />

      {data.lastWeek && data.lastWeek.undone.length > 0 && (
        <LastWeek lastWeek={data.lastWeek} />
      )}

      {active.length === 0 ? (
        <Banner
          emoji="🦜"
          action={<Link to="/settings/family">Mønstr besætningen</Link>}
        >
          Ingen besætning endnu! Mønstr familien, så der er nogen at betale, når
          en tjans bliver klaret.
        </Banner>
      ) : (
        <CrewBoard
          crew={crew
            .filter((m) => !m.archived || m.earned > 0)
            .map((m) => ({ ...m, chores: choresBy(m.id) }))}
        />
      )}

      <section aria-labelledby="quests-heading" className="flex flex-col gap-3">
        <h2 id="quests-heading" className="text-lg font-black tracking-tight">
          {theme.questsTitle}
          {chores.length > 0 && (
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              {chores.length - finished} tilbage
            </span>
          )}
        </h2>
        {chores.length === 0 ? (
          <Banner
            emoji="⚓"
            action={
              <Link to="/chores/plan" search={{ week: "this" }}>
                Planlæg denne uge
              </Link>
            }
          >
            Ingen tjanser på dette togt endnu. Træk tjanser fra arkivet ind i
            ugen.
          </Banner>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {chores.map((chore, index) => (
              <WeekChoreCard
                key={chore.id}
                chore={chore}
                crew={active}
                editable={editable}
                index={index}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <PageTile
          to="/chores/treasure"
          emoji="🧰"
          title="Skattekisten"
          text="Brug dine dubloner på bytte."
          className="bg-[linear-gradient(150deg,#2e1065_0%,#581c87_55%,#86198f_100%)] text-white"
        />
        <PageTile
          to="/chores/log"
          emoji="📜"
          title="Logbogen"
          text={
            data.recent[0]
              ? `Senest: ${data.recent[0].member.name} ${data.recent[0].kind === "reward" ? "klarede" : data.recent[0].kind === "purchase" ? "plyndrede" : "betalte for"} ${data.recent[0].note}`
              : "Hver eneste dublon ind og ud."
          }
          className="border-2 border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] text-amber-950 dark:border-amber-900/60 dark:bg-[linear-gradient(180deg,#1c1407_0%,#2a1d0a_100%)] dark:text-amber-50"
        />
      </div>
    </div>
  )
}

function Banner({
  emoji,
  action,
  children,
}: {
  emoji: string
  action: React.ReactElement
  children: React.ReactNode
}) {
  return (
    <div className="game-rise flex flex-wrap items-center gap-4 rounded-3xl border-2 border-dashed border-sky-300 bg-sky-50 p-5 dark:border-sky-700 dark:bg-sky-950/40">
      <span aria-hidden className="game-float text-4xl">
        {emoji}
      </span>
      <p className="flex-1 text-sm font-medium">{children}</p>
      <Button nativeButton={false} render={action} />
    </div>
  )
}

function LastWeek({ lastWeek }: { lastWeek: NonNullable<Data["lastWeek"]> }) {
  const { undone, lost } = lastWeek
  return (
    <div
      role="note"
      className="game-rise flex gap-4 rounded-3xl bg-[linear-gradient(120deg,#09090b_0%,#450a0a_55%,#09090b_100%)] p-5 text-red-50 shadow-lg"
    >
      <span aria-hidden className="game-wobble text-4xl">
        💀
      </span>
      <div className="flex flex-col gap-2 text-sm">
        <p>
          <span className="font-black text-red-300">
            Arrr! Sidste togt blev {undone.length}{" "}
            {undone.length === 1 ? "tjans" : "tjanser"} ladt i stikken:
          </span>{" "}
          {undone.join(", ")}.
        </p>
        {lost.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {lost.map(({ member, amount }) => (
              <li
                key={member.id}
                className="flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pr-2.5 pl-0.5"
              >
                <MemberAvatar member={member} size="sm" />
                {member.name}
                <DoubloonChange
                  amount={-amount}
                  kind="penalty"
                  className="text-red-300"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PageTile({
  to,
  emoji,
  title,
  text,
  className,
}: {
  to: "/chores/treasure" | "/chores/log"
  emoji: string
  title: string
  text: string
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        "game-rise group/tile flex items-center gap-4 rounded-3xl p-5 shadow-sm transition-[translate,box-shadow] hover:-translate-y-1 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      <span
        aria-hidden
        className="text-4xl transition-transform group-hover/tile:scale-125 group-hover/tile:-rotate-12"
      >
        {emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-black">{title}</span>
        <span className="truncate text-sm opacity-75">{text}</span>
      </span>
      <span
        aria-hidden
        className="text-2xl transition-transform group-hover/tile:translate-x-1"
      >
        →
      </span>
    </Link>
  )
}
