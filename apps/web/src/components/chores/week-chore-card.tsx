import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { RotateCcwIcon, SparklesIcon } from "lucide-react"

import type { Member } from "@/components/chores/member-avatar"
import type { WeekChore } from "@/server/weeks"
import { CoinBurst } from "@/components/chores/game/celebrate"
import { questIcon } from "@/components/chores/game/quest-icon"
import { MemberAvatar, MemberPicker } from "@/components/chores/member-avatar"
import {
  completeWeekChore,
  reopenWeekChore,
  setWeekChoreItemDone,
} from "@/server/weeks"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { cn } from "@workspace/ui/lib/utils"
import { useVoyageTheme } from "@/components/chores/game/themes"

/**
 * A chore on this week's board, as a quest. Anyone can tick its checklist;
 * when it's finished we ask who did it, and they get the whole reward.
 */
export function WeekChoreCard({
  chore,
  crew,
  editable,
  index = 0,
}: {
  chore: WeekChore
  /** Members who can be picked. */
  crew: Array<Member>
  editable: boolean
  /** Position on the board, to stagger the entrance. */
  index?: number
}) {
  const router = useRouter()
  const theme = useVoyageTheme()
  const [ticks, setTicks] = React.useState<Record<string, boolean>>({})
  // `undefined` = use the server's value.
  const [doneBy, setDoneBy] = React.useState<Member | null | undefined>()
  const [asking, setAsking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [burst, setBurst] = React.useState(0)

  // Fresh data from the server wins over local changes.
  React.useEffect(() => {
    setTicks({})
    setDoneBy(undefined)
  }, [chore])

  const items = chore.items.map((item) => ({
    ...item,
    done: ticks[item.id] ?? item.done,
  }))
  const finishedBy = doneBy === undefined ? chore.doneBy : doneBy
  const doneCount = items.filter((i) => i.done).length
  const allTicked = items.length > 0 && doneCount === items.length
  const waiting = !finishedBy && allTicked

  const run = async (action: () => Promise<unknown>, rollback: () => void) => {
    setError(null)
    try {
      await action()
      await router.invalidate()
    } catch (err) {
      console.error("[chores] could not save", err)
      rollback()
      setError("Arrh, det kunne ikke gemmes. Prøv igen.")
    }
  }

  const toggle = (id: string, done: boolean) => {
    setTicks((prev) => ({ ...prev, [id]: done }))
    if (!done && finishedBy) setDoneBy(null)
    // Ticking the last box: ask who finished it straight away.
    const nowAllTicked = items.every((i) => (i.id === id ? done : i.done))
    if (done && nowAllTicked && !finishedBy) setAsking(true)
    void run(
      () => setWeekChoreItemDone({ data: { id, done } }),
      () => {
        setTicks((prev) => ({ ...prev, [id]: !done }))
        setDoneBy(undefined)
      }
    )
  }

  const pick = (member: Member) => {
    setAsking(false)
    if (!finishedBy) setBurst((n) => n + 1)
    setDoneBy(member)
    void run(
      () => completeWeekChore({ data: { id: chore.id, memberId: member.id } }),
      () => setDoneBy(undefined)
    )
  }

  const reopen = () => {
    setDoneBy(null)
    void run(
      () => reopenWeekChore({ data: { id: chore.id } }),
      () => setDoneBy(undefined)
    )
  }

  const pickerProps = {
    members: crew,
    selectedId: finishedBy?.id,
    onPick: pick,
    open: asking,
    onOpenChange: setAsking,
  }

  return (
    <article
      className={cn(
        "game-rise group/quest relative flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 text-card-foreground shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg",
        !finishedBy && "border-amber-300/70 dark:border-amber-500/40",
        waiting && "game-glow border-amber-400"
      )}
      style={{
        animationDelay: `${index * 60}ms`,
        ...(finishedBy
          ? {
              borderColor: finishedBy.color,
              backgroundImage: `linear-gradient(150deg, color-mix(in oklab, ${finishedBy.color} 28%, var(--card)) 0%, var(--card) 70%)`,
            }
          : {}),
      }}
    >
      <CoinBurst play={burst} amount={chore.doubloons} />

      <header className={cn("flex items-start gap-3", finishedBy && "pr-16")}>
        <span
          aria-hidden
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-200 text-2xl shadow-inner transition-transform group-hover/quest:-rotate-6 dark:from-sky-900 dark:to-indigo-900",
            finishedBy && "grayscale-[40%]"
          )}
        >
          {questIcon(chore.title)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            className={cn(
              "text-base leading-snug font-bold",
              finishedBy && "text-muted-foreground line-through decoration-2"
            )}
          >
            {chore.title}
          </h3>
          {chore.doubloons > 0 && <RewardPill amount={chore.doubloons} />}
        </div>
      </header>

      {finishedBy && (
        <div
          aria-hidden
          className="game-stamp pointer-events-none absolute top-3 right-3 flex flex-col items-center rounded-full border-4 bg-card/80 px-2.5 py-1.5 shadow-md backdrop-blur-sm"
          style={{ borderColor: finishedBy.color, color: finishedBy.color }}
        >
          <MemberAvatar member={finishedBy} size="md" />
          <span className="mt-0.5 text-[0.65rem] font-black tracking-widest uppercase">
            {theme.stamp}
          </span>
        </div>
      )}

      {items.length > 0 && (
        <>
          {!finishedBy && (
            <div className="flex items-center gap-2">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={items.length}
                  aria-valuenow={doneCount}
                  aria-label={`${doneCount} af ${items.length} afkrydset`}
                  className="game-shine relative h-full overflow-hidden rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${(doneCount / items.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {doneCount}/{items.length}
              </span>
            </div>
          )}
          <ul className="flex flex-col">
            {items.map((item) => {
              const id = `item-${item.id}`
              return (
                <li key={item.id} className="flex items-start gap-2.5 py-1">
                  <Checkbox
                    id={id}
                    className="mt-0.5 size-5 rounded-md border-2 data-checked:animate-[game-pop_.35s_ease-out] data-checked:border-emerald-500 data-checked:bg-emerald-500 dark:data-checked:bg-emerald-500"
                    checked={item.done}
                    disabled={!editable}
                    onCheckedChange={(checked) => toggle(item.id, checked)}
                  />
                  <Label
                    htmlFor={id}
                    className={cn(
                      "leading-snug font-normal transition-colors",
                      item.done && "text-muted-foreground line-through"
                    )}
                  >
                    {item.label}
                  </Label>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {finishedBy ? (
          <>
            <p
              className="flex-1 text-sm font-bold"
              style={{ color: finishedBy.color }}
            >
              {finishedBy.name} klarede den!
            </p>
            {editable && (
              <>
                <MemberPicker
                  {...pickerProps}
                  title={theme.whoDidIt}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Skift
                    </Button>
                  }
                />
                {items.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reopen}
                    aria-label={`Markér ${chore.title} som ikke klaret`}
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Ikke klaret
                  </Button>
                )}
              </>
            )}
          </>
        ) : editable && (items.length === 0 || allTicked) ? (
          <MemberPicker
            {...pickerProps}
            title={theme.whoDidIt}
            description={
              chore.doubloons > 0
                ? `De får alle ${chore.doubloons} dubloner.`
                : undefined
            }
            trigger={
              <Button
                className={cn(
                  "h-10 flex-1 rounded-xl border-b-4 text-base font-black text-white shadow-md transition-transform active:translate-y-0.5 active:border-b-2",
                  waiting
                    ? "border-amber-700 bg-gradient-to-b from-amber-400 to-orange-500 hover:from-amber-300"
                    : "border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300"
                )}
              >
                {waiting ? (
                  `${theme.emoji} Hvem klarede den?`
                ) : (
                  <>
                    <SparklesIcon data-icon="inline-start" />
                    Klaret!
                  </>
                )}
              </Button>
            }
          />
        ) : null}
      </footer>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </article>
  )
}

/** A shiny gold coin pill with the reward. */
export function RewardPill({ amount }: { amount: number }) {
  return (
    <span className="game-shine relative inline-flex w-fit items-center gap-1 overflow-hidden rounded-full border border-amber-600/40 bg-gradient-to-b from-amber-200 to-amber-400 px-2.5 py-0.5 text-sm font-black text-amber-950 shadow-sm">
      <GoldCoin />
      {amount}
      <span className="sr-only">dubloner</span>
    </span>
  )
}
