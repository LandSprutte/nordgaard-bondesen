import type * as React from "react"

import type { Member } from "@/components/chores/member-avatar"
import type { VoyageTheme } from "@/components/chores/game/themes"
import type { WeekChore } from "@/server/weeks"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { questIcon } from "@/components/chores/game/quest-icon"
import { cn } from "@workspace/ui/lib/utils"

/** 0 = everyday, 1 = good, 2 = gold, by reward. */
export function rarityOf(doubloons: number): 0 | 1 | 2 {
  return doubloons >= 300 ? 2 : doubloons >= 100 ? 1 : 0
}

/**
 * A chore as a quest. Anyone can tick its steps; tapping a face says who
 * finished it, and they get the whole reward.
 */
export function QuestCard({
  chore,
  crew,
  theme,
  editable,
  canUndo,
  index,
  onTick,
  onComplete,
  onReopen,
}: {
  chore: WeekChore
  crew: Array<Member>
  theme: VoyageTheme
  editable: boolean
  /** Parents can reopen a finished chore; children can't. */
  canUndo: boolean
  index: number
  onTick: (itemId: string, done: boolean) => void
  onComplete: (member: Member, button: HTMLElement) => void
  onReopen: () => void
}) {
  const by = chore.doneBy
  const steps = chore.items.length
  const ticked = chore.items.filter((i) => i.done).length
  const ready = !by && steps > 0 && ticked === steps
  const rarity = rarityOf(chore.doubloons)

  return (
    <article
      className={cn("tg-panel tg-quest", by && "is-done", ready && "is-ready")}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="tg-q-top">
        <div aria-hidden className="tg-q-ico">
          {questIcon(chore.title)}
        </div>
        <div>
          <h3 className="tg-q-name">{chore.title}</h3>
          <div className="tg-q-tags">
            {chore.doubloons > 0 && (
              <span className="tg-pill is-gold tg-num">
                <GoldCoin className="tg-coin" />
                {chore.doubloons}
                <span className="sr-only">dubloner</span>
              </span>
            )}
            <span className={`tg-pill tg-rar r${rarity}`}>
              {theme.rarity[rarity]}
            </span>
            {chore.doubloons > 0 && (
              <span className="tg-pill tg-rar r0">+{chore.doubloons} XP</span>
            )}
          </div>
        </div>
      </div>

      {by && (
        <div
          className="tg-stamp"
          style={{ "--mc": by.color } as React.CSSProperties}
        >
          <em aria-hidden>{by.emoji}</em>
          {theme.stamp}
        </div>
      )}

      {steps > 0 && (
        <>
          <div className="tg-segs" aria-hidden>
            {chore.items.map((item) => (
              <i key={item.id} className={item.done ? "is-on" : undefined} />
            ))}
          </div>
          <ul className="tg-steps">
            {chore.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="tg-step"
                  aria-pressed={item.done}
                  disabled={!editable || (!!by && !canUndo)}
                  onClick={() => onTick(item.id, !item.done)}
                >
                  <span aria-hidden className="tg-box">
                    {item.done && "✓"}
                  </span>
                  <span className="tg-step-l">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {by ? (
        <div className="tg-done-row">
          <span>
            {by.name} klarede den
            {chore.doubloons > 0 && ` · +${chore.doubloons}`}
          </span>
          {editable && canUndo && (
            <button
              type="button"
              className="tg-link-btn"
              onClick={onReopen}
              aria-label={`Fortryd: ${chore.title} er ikke klaret`}
            >
              ↩ Fortryd
            </button>
          )}
        </div>
      ) : (
        editable && (
          <div className="tg-q-act">
            <span>
              {steps > 0 && !ready
                ? `Trin ${ticked}/${steps} · hvem klarede det hele?`
                : theme.whoDidIt}
            </span>
            {crew.length === 0 && <span>Ingen i besætningen endnu.</span>}
            {crew.map((member) => (
              <button
                key={member.id}
                type="button"
                className="tg-who"
                style={{ "--mc": member.color } as React.CSSProperties}
                aria-label={`${member.name} klarede ${chore.title}`}
                onClick={(e) => onComplete(member, e.currentTarget)}
              >
                <em aria-hidden>{member.emoji}</em>
                {member.name}
              </button>
            ))}
          </div>
        )
      )}
    </article>
  )
}
