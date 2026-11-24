import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { LockIcon, Settings2Icon } from "lucide-react"

import type {
  ChestReveal,
  ChestState,
} from "@/components/chores/game/big-chest"
import type { Member } from "@/components/chores/member-avatar"
import { PageHeader } from "@/components/budget/page-header"
import { BigChest } from "@/components/chores/game/big-chest"
import { Confetti, CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { treasureIcon } from "@/components/chores/game/treasure-icon"
import { MemberAvatar, MemberPicker } from "@/components/chores/member-avatar"
import { getPurses } from "@/server/doubloons"
import { claimTreasure, listTreasures } from "@/server/treasures"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/_dashboard/chores/treasure")({
  staticData: { title: "Skattekisten" },
  loader: async () => {
    const [treasures, crew] = await Promise.all([listTreasures(), getPurses()])
    return { treasures, crew }
  },
  component: TreasurePage,
})

type Treasure = Awaited<ReturnType<typeof listTreasures>>[number]
type Purse = Awaited<ReturnType<typeof getPurses>>[number]

/** How long the chest stays open after a claim. */
const CLAIMED_MS = 4500

function TreasurePage() {
  const { treasures, crew } = Route.useLoaderData()
  const router = useRouter()
  // The treasure being looked at (hovered, focused or being claimed).
  const [peek, setPeek] = React.useState<string | null>(null)
  const [pickerFor, setPickerFor] = React.useState<string | null>(null)
  const [claimed, setClaimed] = React.useState<{
    treasure: Treasure
    member: Member
  } | null>(null)
  const [confetti, setConfetti] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!claimed) return
    const timer = setTimeout(() => setClaimed(null), CLAIMED_MS)
    return () => clearTimeout(timer)
  }, [claimed])

  const richest = [...crew].sort((a, b) => b.balance - a.balance).at(0)
  const looking = treasures.find((t) => t.id === (pickerFor ?? peek))
  const canAfford = (t: Treasure) => crew.filter((m) => m.balance >= t.cost)

  let state: ChestState = "closed"
  let reveal: ChestReveal | null = null
  if (claimed) {
    state = "claimed"
    reveal = {
      emoji: treasureIcon(claimed.treasure.title),
      title: claimed.treasure.title,
      caption: `${claimed.member.name} plyndrede den! 🎉`,
    }
  } else if (looking) {
    const rich = canAfford(looking)
    if (rich.length > 0) {
      state = "open"
      reveal = {
        emoji: treasureIcon(looking.title),
        title: looking.title,
        caption:
          rich.length === 1
            ? `${rich[0].name} kan plyndre den!`
            : `${rich.map((m) => m.name).join(", ")} kan plyndre den!`,
      }
    } else {
      state = "locked"
      reveal = {
        emoji: "🔒",
        title: looking.title,
        caption: richest
          ? `Låst! ${richest.name} mangler ${looking.cost - richest.balance} dubloner endnu.`
          : "Låst! Ingen har dubloner endnu.",
      }
    }
  }

  const claim = async (treasure: Treasure, member: Member) => {
    setPickerFor(null)
    setError(null)
    try {
      await claimTreasure({
        data: { treasureId: treasure.id, memberId: member.id },
      })
      setClaimed({ treasure, member })
      setConfetti((n) => n + 1)
      await router.invalidate()
    } catch (err) {
      console.error("[treasure] could not claim", err)
      setError(`Arrh, ${treasure.title} kunne ikke plyndres. Prøv igen.`)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <Confetti play={confetti} />
      <PageHeader
        title="Skattekisten"
        description="Brug dine dubloner på skatte. Hold musen over én for at kigge i kisten."
      >
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/settings/treasures" />}
        >
          <Settings2Icon data-icon="inline-start" />
          Administrér skatte
        </Button>
      </PageHeader>

      <section
        aria-label="Kisten"
        className="game-rise relative isolate overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_50%_80%,#7e22ce_0%,#3b0764_45%,#0f0326_100%)] px-4 pt-6 pb-4 text-white shadow-xl"
      >
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-[linear-gradient(180deg,transparent,#facc1533)]"
        />
        <BigChest state={state} reveal={reveal} />
        <p
          role="status"
          className="mt-2 min-h-5 text-center text-sm font-semibold text-white/80"
        >
          {state === "closed" &&
            (treasures.length > 0
              ? "Hold musen over en skat herunder for at kigge i kisten…"
              : "Kisten er tom. Tilføj skatte under indstillinger.")}
          {error && <span className="text-red-300">{error}</span>}
        </p>

        {crew.length > 0 && (
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {crew.map((member) => (
              <PurseChip key={member.id} member={member} />
            ))}
          </ul>
        )}
      </section>

      {treasures.length > 0 && (
        <section aria-labelledby="loot-heading" className="flex flex-col gap-3">
          <h2 id="loot-heading" className="text-lg font-black tracking-tight">
            Byttet
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {treasures.map((treasure, index) => (
              <LootCard
                key={treasure.id}
                treasure={treasure}
                index={index}
                rich={canAfford(treasure)}
                richest={richest}
                active={looking?.id === treasure.id}
                pickerOpen={pickerFor === treasure.id}
                onPeek={(on) =>
                  setPeek((current) =>
                    on ? treasure.id : current === treasure.id ? null : current
                  )
                }
                onPickerChange={(open) =>
                  setPickerFor(open ? treasure.id : null)
                }
                onClaim={(member) => void claim(treasure, member)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function PurseChip({ member }: { member: Purse }) {
  return (
    <li className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 ring-1 ring-white/15 backdrop-blur-sm">
      <MemberAvatar member={member} size="sm" className="ring-purple-950" />
      <span className="text-sm font-semibold">{member.name}</span>
      <span className="flex items-center gap-1 text-sm font-black text-amber-300 tabular-nums">
        <GoldCoin />
        <CountUp value={member.balance} />
      </span>
    </li>
  )
}

function LootCard({
  treasure,
  index,
  rich,
  richest,
  active,
  pickerOpen,
  onPeek,
  onPickerChange,
  onClaim,
}: {
  treasure: Treasure
  index: number
  rich: Array<Purse>
  richest: Purse | undefined
  active: boolean
  pickerOpen: boolean
  onPeek: (on: boolean) => void
  onPickerChange: (open: boolean) => void
  onClaim: (member: Member) => void
}) {
  const affordable = rich.length > 0
  const best = richest?.balance ?? 0
  return (
    <li
      onPointerEnter={() => onPeek(true)}
      onPointerLeave={() => onPeek(false)}
      onFocus={() => onPeek(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          onPeek(false)
        }
      }}
      className={cn(
        "game-rise group/loot relative flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 shadow-sm transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-lg",
        affordable
          ? "border-amber-300 dark:border-amber-500/50"
          : "border-border",
        active &&
          affordable &&
          "border-amber-400 shadow-[0_0_0_4px_rgb(251_191_36/0.35)]",
        active && !affordable && "border-zinc-400"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-inner transition-transform group-hover/loot:scale-110 group-hover/loot:-rotate-6",
            affordable
              ? "bg-gradient-to-br from-amber-100 to-fuchsia-200 dark:from-amber-900 dark:to-fuchsia-900"
              : "bg-muted grayscale"
          )}
        >
          {treasureIcon(treasure.title)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="leading-snug font-bold">{treasure.title}</h3>
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-600/40 bg-gradient-to-b from-amber-200 to-amber-400 px-2.5 py-0.5 text-sm font-black text-amber-950">
            <GoldCoin />
            {new Intl.NumberFormat("da-DK").format(treasure.cost)}
            <span className="sr-only">dubloner</span>
          </span>
        </div>
      </div>

      {affordable ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex -space-x-1.5">
            {rich.map((m) => (
              <MemberAvatar key={m.id} member={m} size="sm" />
            ))}
          </div>
          kan plyndre den
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 transition-[width] duration-700"
              style={{ width: `${Math.min(1, best / treasure.cost) * 100}%` }}
            />
          </div>
          <span className="flex items-center gap-1">
            <LockIcon aria-hidden className="size-3" />
            {richest
              ? `${richest.name} mangler ${treasure.cost - best}`
              : "Ingen har dubloner endnu"}
          </span>
        </div>
      )}

      <MemberPicker
        members={rich}
        title={`Hvem plyndrer ${treasure.title}?`}
        description={`Den koster ${treasure.cost} dubloner.`}
        open={pickerOpen}
        onOpenChange={onPickerChange}
        onPick={onClaim}
        trigger={
          <Button
            disabled={!affordable}
            className={cn(
              "mt-auto h-10 rounded-xl border-b-4 text-base font-black transition-transform active:translate-y-0.5 active:border-b-2",
              affordable
                ? "border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 hover:from-amber-200"
                : "border-transparent"
            )}
          >
            {affordable ? "💰 Plyndr den!" : "🔒 Låst"}
          </Button>
        }
      />
    </li>
  )
}
