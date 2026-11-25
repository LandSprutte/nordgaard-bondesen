import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"

import type {
  ChestReveal,
  ChestState,
} from "@/components/chores/game/big-chest"
import { BigChest } from "@/components/chores/game/big-chest"
import { Confetti, CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { treasureIcon } from "@/components/chores/game/treasure-icon"
import { useToast } from "@/components/togt/effects"
import { getChest } from "@/server/doubloons"
import { listTreasures, redeemTreasure } from "@/server/treasures"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/togt/skat")({
  head: () => ({ meta: [{ title: "Skattekisten · Tjansetogt" }] }),
  loader: async () => {
    const [treasures, chest] = await Promise.all([listTreasures(), getChest()])
    return { treasures, chest }
  },
  component: TreasurePage,
})

type Treasure = Awaited<ReturnType<typeof listTreasures>>[number]

/** How long the chest stays open after a treasure is redeemed. */
const CLAIMED_MS = 4500
const count = new Intl.NumberFormat("da-DK")

function TreasurePage() {
  const { treasures, chest } = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const router = useRouter()
  const toast = useToast()
  // The treasure being looked at (hovered, focused or tapped).
  const [peek, setPeek] = React.useState<string | null>(null)
  const [claimed, setClaimed] = React.useState<Treasure | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [confetti, setConfetti] = React.useState(0)

  React.useEffect(() => {
    if (!claimed) return
    const timer = setTimeout(() => setClaimed(null), CLAIMED_MS)
    return () => clearTimeout(timer)
  }, [claimed])

  const looking = treasures.find((t) => t.id === peek)
  const canAfford = (t: Treasure) => chest.balance >= t.cost

  let state: ChestState = "closed"
  let reveal: ChestReveal | null = null
  if (claimed) {
    state = "claimed"
    reveal = {
      emoji: treasureIcon(claimed.title),
      title: claimed.title,
      caption: "Hele familien har tjent den! 🎉",
    }
  } else if (looking) {
    if (canAfford(looking)) {
      state = "open"
      reveal = {
        emoji: treasureIcon(looking.title),
        title: looking.title,
        caption: viewer.isParent
          ? "Der er nok i kisten! Indløs den herunder."
          : "Der er nok i kisten! Hent en voksen.",
      }
    } else {
      state = "locked"
      reveal = {
        emoji: "🔒",
        title: looking.title,
        caption: `Låst! I mangler ${count.format(looking.cost - chest.balance)} dubloner endnu.`,
      }
    }
  }

  const redeem = async (treasure: Treasure) => {
    setBusy(true)
    try {
      await redeemTreasure({ data: { treasureId: treasure.id } })
      setClaimed(treasure)
      setConfetti((n) => n + 1)
      toast.show(`💰 ${treasure.title} er indløst!`)
      window.scrollTo({ top: 0, behavior: "smooth" })
      await router.invalidate()
    } catch (err) {
      console.error("[togt] could not redeem", err)
      toast.show(`Arrh, ${treasure.title} kunne ikke indløses. Prøv igen.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Confetti play={confetti} />
      {toast.element}

      <section className="tg-vault" aria-label="Skattekisten">
        <p className="tg-eyebrow">Familiens fælles skat</p>
        <h2>Skattekisten</h2>
        <BigChest state={state} reveal={reveal} />
        <p className="tg-vault-hint" role="status">
          {state === "closed" &&
            (treasures.length > 0
              ? "Peg på en skat herunder for at kigge i kisten…"
              : "Kisten er tom. En voksen kan lægge skatte i den.")}
        </p>
        <p className="tg-chest-total tg-num">
          <GoldCoin className="tg-coin" />
          <CountUp value={chest.balance} />
          <span className="sr-only">dubloner i kisten</span>
        </p>
      </section>

      <section className="tg-sec" aria-labelledby="loot-h">
        <div className="tg-sec-h">
          <h2 id="loot-h">Fælles mål</h2>
          <span>
            {treasures.length === 0 ? (
              viewer.isParent ? (
                <Link to="/settings/treasures" style={{ color: "inherit" }}>
                  Læg skatte i kisten
                </Link>
              ) : (
                "Ingen skatte endnu"
              )
            ) : (
              `${treasures.length} skatte`
            )}
          </span>
        </div>
        <div className="tg-quests">
          {treasures.map((treasure, index) => (
            <LootCard
              key={treasure.id}
              treasure={treasure}
              index={index}
              balance={chest.balance}
              canRedeem={viewer.isParent}
              active={looking?.id === treasure.id}
              busy={busy}
              onPeek={(on) =>
                setPeek((current) =>
                  on ? treasure.id : current === treasure.id ? null : current
                )
              }
              onRedeem={() => void redeem(treasure)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function LootCard({
  treasure,
  index,
  balance,
  canRedeem,
  active,
  busy,
  onPeek,
  onRedeem,
}: {
  treasure: Treasure
  index: number
  /** What's in the family's chest. */
  balance: number
  /** Only parents redeem treasures. */
  canRedeem: boolean
  active: boolean
  busy: boolean
  onPeek: (on: boolean) => void
  onRedeem: () => void
}) {
  const affordable = balance >= treasure.cost
  return (
    <article
      onPointerEnter={(e) => e.pointerType === "mouse" && onPeek(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onPeek(false)}
      onClick={() => onPeek(true)}
      onFocus={() => onPeek(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onPeek(false)
      }}
      className={cn(
        "tg-panel tg-loot",
        affordable ? "is-rich" : "is-locked",
        active && "is-active"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="tg-q-top">
        <div aria-hidden className="tg-q-ico">
          {treasureIcon(treasure.title)}
        </div>
        <div>
          <h3 className="tg-q-name">{treasure.title}</h3>
          <div className="tg-q-tags">
            <span className="tg-pill is-gold tg-num">
              <GoldCoin className="tg-coin" />
              {count.format(treasure.cost)}
              <span className="sr-only">dubloner</span>
            </span>
            <span className={`tg-pill tg-rar ${affordable ? "r2" : "r0"}`}>
              {affordable ? "Klar!" : "🔒 Låst"}
            </span>
          </div>
        </div>
      </div>

      {affordable ? (
        <div className="tg-q-act">
          {canRedeem ? (
            <button
              type="button"
              className="tg-btn"
              disabled={busy}
              aria-label={`Indløs ${treasure.title}`}
              onClick={(e) => {
                e.stopPropagation()
                onRedeem()
              }}
            >
              Indløs
            </button>
          ) : (
            <span>Klar! En voksen kan indløse den.</span>
          )}
        </div>
      ) : (
        <div
          className="tg-goal-bar"
          role="img"
          aria-label={`${count.format(Math.max(0, balance))} af ${count.format(treasure.cost)} dubloner`}
        >
          <i
            style={{
              width: `${Math.min(1, Math.max(0, balance) / treasure.cost) * 100}%`,
            }}
          />
        </div>
      )}
    </article>
  )
}
