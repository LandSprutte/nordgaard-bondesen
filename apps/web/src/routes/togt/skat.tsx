import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"

import type {
  ChestReveal,
  ChestState,
} from "@/components/chores/game/big-chest"
import type { Member } from "@/components/chores/member-avatar"
import { BigChest } from "@/components/chores/game/big-chest"
import { Confetti, CountUp } from "@/components/chores/game/celebrate"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { treasureIcon } from "@/components/chores/game/treasure-icon"
import { useToast } from "@/components/togt/effects"
import { getPurses } from "@/server/doubloons"
import { claimTreasure, listTreasures } from "@/server/treasures"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/togt/skat")({
  head: () => ({ meta: [{ title: "Skattekisten · Tjansetogt" }] }),
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
const count = new Intl.NumberFormat("da-DK")

function TreasurePage() {
  const { treasures, crew } = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const router = useRouter()
  const toast = useToast()
  // The treasure being looked at (hovered, focused or tapped).
  const [peek, setPeek] = React.useState<string | null>(null)
  const [claimed, setClaimed] = React.useState<{
    treasure: Treasure
    member: Member
  } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [confetti, setConfetti] = React.useState(0)

  React.useEffect(() => {
    if (!claimed) return
    const timer = setTimeout(() => setClaimed(null), CLAIMED_MS)
    return () => clearTimeout(timer)
  }, [claimed])

  const richest = [...crew].sort((a, b) => b.balance - a.balance).at(0)
  const looking = treasures.find((t) => t.id === peek)
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
        caption: `${rich.map((m) => m.name).join(", ")} kan plyndre den!`,
      }
    } else {
      state = "locked"
      reveal = {
        emoji: "🔒",
        title: looking.title,
        caption: richest
          ? `Låst! ${richest.name} mangler ${count.format(looking.cost - richest.balance)} dubloner endnu.`
          : "Låst! Ingen har dubloner endnu.",
      }
    }
  }

  const claim = async (treasure: Treasure, member: Member) => {
    setBusy(true)
    try {
      await claimTreasure({
        data: { treasureId: treasure.id, memberId: member.id },
      })
      setClaimed({ treasure, member })
      setConfetti((n) => n + 1)
      toast.show(`💰 ${member.name} plyndrede ${treasure.title}!`)
      window.scrollTo({ top: 0, behavior: "smooth" })
      await router.invalidate()
    } catch (err) {
      console.error("[togt] could not claim", err)
      toast.show(`Arrh, ${treasure.title} kunne ikke plyndres. Prøv igen.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Confetti play={confetti} />
      {toast.element}

      <section className="tg-vault" aria-label="Skattekisten">
        <p className="tg-eyebrow">Brug dine dubloner</p>
        <h2>Skattekisten</h2>
        <BigChest state={state} reveal={reveal} />
        <p className="tg-vault-hint" role="status">
          {state === "closed" &&
            (treasures.length > 0
              ? "Peg på en skat herunder for at kigge i kisten…"
              : "Kisten er tom. En voksen kan lægge skatte i den.")}
        </p>
        {crew.length > 0 && (
          <ul className="tg-purses">
            {crew.map((m) => (
              <li key={m.id} style={{ "--mc": m.color } as React.CSSProperties}>
                <em aria-hidden>{m.emoji}</em>
                {m.name}
                <span className="tg-amt tg-num">
                  <GoldCoin className="tg-coin" />
                  <CountUp value={m.balance} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tg-sec" aria-labelledby="loot-h">
        <div className="tg-sec-h">
          <h2 id="loot-h">Byttet</h2>
          <span>
            {treasures.length === 0 ? (
              <Link to="/settings/treasures" style={{ color: "inherit" }}>
                Læg skatte i kisten
              </Link>
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
              rich={canAfford(treasure)}
              // Children can only spend their own doubloons.
              buyers={canAfford(treasure).filter(
                (m) => viewer.isParent || m.id === viewer.member.id
              )}
              richest={richest}
              active={looking?.id === treasure.id}
              busy={busy}
              onPeek={(on) =>
                setPeek((current) =>
                  on ? treasure.id : current === treasure.id ? null : current
                )
              }
              onClaim={(member) => void claim(treasure, member)}
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
  rich,
  buyers,
  richest,
  active,
  busy,
  onPeek,
  onClaim,
}: {
  treasure: Treasure
  index: number
  rich: Array<Purse>
  /** Who may claim it from this device. */
  buyers: Array<Purse>
  richest: Purse | undefined
  active: boolean
  busy: boolean
  onPeek: (on: boolean) => void
  onClaim: (member: Member) => void
}) {
  const affordable = rich.length > 0
  const best = richest?.balance ?? 0
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
              {affordable ? "Kan plyndres" : "🔒 Låst"}
            </span>
          </div>
        </div>
      </div>

      {affordable ? (
        <div className="tg-q-act">
          <span>Hvem plyndrer den?</span>
          {buyers.length === 0 && <span>Det er ikke dine dubloner.</span>}
          {buyers.map((member) => (
            <button
              key={member.id}
              type="button"
              className="tg-who"
              disabled={busy}
              style={{ "--mc": member.color } as React.CSSProperties}
              aria-label={`${member.name} plyndrer ${treasure.title}`}
              onClick={(e) => {
                e.stopPropagation()
                onClaim(member)
              }}
            >
              <em aria-hidden>{member.emoji}</em>
              {member.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="tg-goal-bar">
            <i
              style={{ width: `${Math.min(1, best / treasure.cost) * 100}%` }}
            />
          </div>
          <div className="tg-done-row">
            <span>
              {richest
                ? `${richest.name} mangler ${count.format(treasure.cost - best)}`
                : "Ingen har dubloner endnu"}
            </span>
            <span className="tg-num">
              {count.format(best)}/{count.format(treasure.cost)}
            </span>
          </div>
        </>
      )}
    </article>
  )
}
