import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"

import type { Member } from "@/components/chores/member-avatar"
import type { WeekChore } from "@/server/weeks"
import type { Hero } from "@/components/togt/board"
import { Confetti } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { useVoyageTheme } from "@/components/chores/game/themes"
import { CrewAvatars, Goal, Hud } from "@/components/togt/board"
import { levelOf } from "@/lib/progress"
import type { JarDrop } from "@/components/togt/coin-jar"
import { CoinJar } from "@/components/togt/coin-jar"
import { useReplay, useToast } from "@/components/togt/effects"
import { QuestCard, rarityOf } from "@/components/togt/quest-card"
import { Stage } from "@/components/togt/stage"
import {
  completeWeekChore,
  getWeek,
  reopenWeekChore,
  setWeekChoreItemDone,
} from "@/server/weeks"

export const Route = createFileRoute("/togt/")({
  loader: () => getWeek({ data: {} }),
  component: ThisWeek,
})

/** A change made on this device that the server hasn't confirmed yet. */
type Pending = { doneBy?: Member | null; items?: Record<string, boolean> }

function applyPending(
  chore: WeekChore,
  pending: Pending | undefined,
  on: string
) {
  if (!pending) return chore
  const doneBy = pending.doneBy === undefined ? chore.doneBy : pending.doneBy
  return {
    ...chore,
    doneBy,
    doneOn: doneBy ? (chore.doneOn ?? on) : null,
    items: chore.items.map((item) => ({
      ...item,
      done: pending.items?.[item.id] ?? item.done,
    })),
  }
}

function ThisWeek() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const theme = useVoyageTheme()
  const { week, today, editable } = data

  const [pending, setPending] = React.useState<
    Partial<Record<string, Pending>>
  >({})
  // Fresh data from the server replaces what we guessed.
  React.useEffect(() => setPending({}), [data])

  const chores = data.chores.map((c) => applyPending(c, pending[c.id], today))
  const active = data.crew.filter((m) => !m.archived)
  const finished = chores.filter((c) => c.doneBy).length
  const allDone = chores.length > 0 && finished === chores.length

  const heroes: Array<Hero> = data.crew.map((m) => {
    const mine = chores.filter((c) => c.doneBy?.id === m.id)
    const gain = mine.reduce((sum, c) => sum + c.doubloons, 0)
    // What changed here but isn't saved yet.
    const delta = gain - m.earned
    return {
      ...m,
      gain,
      chores: mine.length,
      xp: m.xp + delta,
    }
  })
  // The chest, with what's been earned here but isn't saved yet.
  const chestBalance =
    data.chest.balance +
    heroes.reduce((sum, h) => sum + h.gain, 0) -
    data.crew.reduce((sum, m) => sum + m.earned, 0)
  const shown = heroes.filter((h) => !h.archived || h.gain > 0)
  const best = Math.max(0, ...heroes.map((h) => h.gain))
  const doneDays = new Set(chores.flatMap((c) => (c.doneOn ? [c.doneOn] : [])))
  const streak = data.streakBeforeToday + (doneDays.has(today) ? 1 : 0)

  // Effects.
  const toast = useToast()
  const [walletHit, setWalletHit] = React.useState(0)
  const wallet = useReplay<HTMLDivElement>(walletHit, "is-hit")
  const [pow, setPow] = React.useState<{ key: number; word: string } | null>(
    null
  )
  const [confetti, setConfetti] = React.useState(0)
  const [jar, setJar] = React.useState<JarDrop | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const save = async (
    choreId: string,
    change: Pending,
    action: () => Promise<unknown>
  ) => {
    setError(null)
    setPending((prev) => ({
      ...prev,
      [choreId]: {
        ...prev[choreId],
        ...change,
        items: { ...prev[choreId]?.items, ...change.items },
      },
    }))
    try {
      await action()
      await router.invalidate()
    } catch (err) {
      console.error("[togt] could not save", err)
      setPending((prev) => {
        const { [choreId]: _dropped, ...rest } = prev
        return rest
      })
      setError("Arrh, det kunne ikke gemmes. Prøv igen.")
    }
  }

  const complete = (chore: WeekChore, member: Member) => {
    const hero = heroes.find((h) => h.id === member.id)
    const levelBefore = levelOf(hero?.xp ?? 0)
    const levelAfter = levelOf((hero?.xp ?? 0) + chore.doubloons)
    const lastOne = finished + 1 === chores.length

    if (chore.doubloons > 0) {
      setJar((prev) => ({
        key: (prev?.key ?? 0) + 1,
        amount: chore.doubloons,
        from: chestBalance,
        to: chestBalance + chore.doubloons,
        goal: data.chest.goal,
      }))
      setTimeout(() => setWalletHit((n) => n + 1), 1600)
    }
    setPow((prev) => ({
      key: (prev?.key ?? 0) + 1,
      word: theme.pow[Math.floor(Math.random() * theme.pow.length)],
    }))
    if (lastOne) {
      setConfetti((n) => n + 1)
      toast.show("🗝️ Skattekisten er åben. Fri plyndring!")
    } else {
      toast.show(
        <>
          {levelAfter > levelBefore &&
            `⬆️ LEVEL UP! ${member.name} er nu LV ${levelAfter} · `}
          {chore.doubloons > 0 && (
            <>
              <GoldCoin className="tg-coin" /> +{chore.doubloons} ·{" "}
            </>
          )}
          {theme.cheer(member.name)}
          {rarityOf(chore.doubloons) === 2 && " 🌟"}
        </>
      )
    }

    void save(
      chore.id,
      {
        doneBy: member,
        items: Object.fromEntries(chore.items.map((i) => [i.id, true])),
      },
      () => completeWeekChore({ data: { id: chore.id, memberId: member.id } })
    )
  }

  const tick = (chore: WeekChore, itemId: string, done: boolean) => {
    const ticked = chore.items.filter((i) =>
      i.id === itemId ? done : i.done
    ).length
    if (done) {
      toast.show(
        ticked === chore.items.length
          ? "✅ Alle trin klaret! Hvem gjorde det?"
          : `✔️ Trin ${ticked} af ${chore.items.length}`
      )
    }
    void save(
      chore.id,
      {
        items: { [itemId]: done },
        ...(!done && chore.doneBy ? { doneBy: null } : {}),
      },
      () => setWeekChoreItemDone({ data: { id: itemId, done } })
    )
  }

  const reopen = (chore: WeekChore) => {
    toast.show(`↩ ${chore.title} er ikke klaret alligevel`)
    void save(chore.id, { doneBy: null }, () =>
      reopenWeekChore({ data: { id: chore.id } })
    )
  }

  const upForGrabs = chores
    .filter((c) => !c.doneBy)
    .reduce((sum, c) => sum + c.doubloons, 0)

  return (
    <>
      <Confetti play={confetti} />
      <CoinJar drop={jar} />
      {toast.element}

      <Hud
        theme={theme}
        teamXp={heroes.reduce((sum, h) => sum + h.xp, 0)}
        streak={streak}
        coins={chestBalance}
        walletRef={wallet}
      />

      <Goal
        goal={data.chest.goal}
        balance={chestBalance}
        ready={data.chest.ready}
      />

      <Stage
        theme={theme}
        week={week}
        today={today}
        total={chores.length}
        done={heroes.map((member) => ({ member, count: member.chores }))}
        doneDays={doneDays}
        upForGrabs={upForGrabs}
        pow={pow}
        corner={<CrewAvatars heroes={shown} theme={theme} best={best} />}
      />

      <section className="tg-sec" aria-labelledby="quests-h">
        <div className="tg-sec-h">
          <h2 id="quests-h">{theme.questsTitle}</h2>
          {chores.length > 0 && (
            <span>
              {allDone ? "Alle klaret!" : `${chores.length - finished} tilbage`}
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="tg-error">
            {error}
          </p>
        )}
        {chores.length === 0 ? (
          <Note
            icon="⚓"
            action={
              <Link to="/chores/plan" search={{ week: "this" }}>
                Planlæg denne uge
              </Link>
            }
          >
            Ingen tjanser på dette togt endnu. Træk tjanser fra arkivet ind i
            ugen.
          </Note>
        ) : (
          <div className="tg-quests">
            {[...chores]
              // Open quests first; the order is otherwise the plan's.
              .sort((a, b) => Number(!!a.doneBy) - Number(!!b.doneBy))
              .map((chore, index) => (
                <QuestCard
                  key={chore.id}
                  chore={chore}
                  // Children can only say they did it themselves.
                  crew={
                    data.me.isParent
                      ? active
                      : active.filter((m) => m.id === data.me.id)
                  }
                  theme={theme}
                  editable={editable}
                  canUndo={data.me.isParent}
                  self={
                    data.me.isParent
                      ? undefined
                      : active.find((m) => m.id === data.me.id)
                  }
                  index={index}
                  onTick={(itemId, done) => tick(chore, itemId, done)}
                  onComplete={(member) => complete(chore, member)}
                  onReopen={() => reopen(chore)}
                />
              ))}
          </div>
        )}
      </section>
    </>
  )
}

function Note({
  icon,
  action,
  children,
}: {
  icon: string
  action: React.ReactElement<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="tg-panel tg-note">
      <span aria-hidden className="tg-note-ico">
        {icon}
      </span>
      <p>{children}</p>
      {React.cloneElement(action, { className: "tg-btn" })}
    </div>
  )
}
