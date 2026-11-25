import * as React from "react"

import { GoldCoin } from "@/components/chores/game/gold-coin"
import { cn } from "@workspace/ui/lib/utils"

/** One completed chore's doubloons going into the family's chest. */
export type JarDrop = {
  /** Goes up for every drop, so the animation replays. */
  key: number
  amount: number
  /** The chest before and after. */
  from: number
  to: number
  /** What the family is saving up for; the jar is full at its cost. */
  goal: { title: string; cost: number } | null
}

/** How long the jar stays on screen. */
const SHOW_MS = 2800
const count = new Intl.NumberFormat("da-DK")

/** Without a goal, the jar fills towards the next round 500. */
function capacityFor(drop: JarDrop) {
  return drop.goal?.cost ?? Math.max(500, Math.ceil((drop.to + 1) / 500) * 500)
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))

/**
 * A glass jar in the middle of the screen: coins drop in and it fills up
 * towards the family's goal. Decoration only; the toast says it in words.
 */
export function CoinJar({ drop }: { drop: JarDrop | null }) {
  const [shown, setShown] = React.useState<JarDrop | null>(null)

  React.useEffect(() => {
    if (!drop) return
    setShown(drop)
    const timer = setTimeout(() => setShown(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [drop])

  if (!shown) return null
  const capacity = capacityFor(shown)
  const before = clamp(shown.from / capacity)
  const after = clamp(shown.to / capacity)
  const reached =
    shown.goal !== null &&
    shown.from < shown.goal.cost &&
    shown.to >= shown.goal.cost
  const coins = Math.min(9, 3 + Math.round(shown.amount / 40))

  return (
    <div key={shown.key} aria-hidden className="tg-jar-overlay">
      <div
        className={cn("tg-jar", reached && "is-full")}
        style={
          {
            "--before": before,
            "--after": after,
          } as React.CSSProperties
        }
      >
        <div className="tg-jar-drops">
          {Array.from({ length: coins }, (_, i) => (
            <span
              key={i}
              className="tg-jar-coin"
              style={
                {
                  "--i": i,
                  "--x": `${((i * 37) % 60) - 30}px`,
                  "--spin": `${((i * 73) % 360) - 180}deg`,
                } as React.CSSProperties
              }
            >
              <GoldCoin />
            </span>
          ))}
        </div>
        <JarGlass />
      </div>
      <div className="tg-jar-label">
        <b className="tg-disp tg-num">+{count.format(shown.amount)}</b>
        <span>
          {reached && shown.goal
            ? `🎉 Klar til ${shown.goal.title}!`
            : shown.goal
              ? `${shown.goal.title} · ${count.format(Math.max(0, shown.to))}/${count.format(shown.goal.cost)}`
              : "til fælleskisten"}
        </span>
      </div>
    </div>
  )
}

/** The jar itself, with the coins inside rising from `--before` to `--after`. */
function JarGlass() {
  const id = React.useId()
  const body =
    "M62 40 C62 56 32 60 32 92 L32 200 Q32 228 60 228 L140 228 Q168 228 168 200 L168 92 C168 60 138 56 138 40 Z"
  return (
    <svg viewBox="0 0 200 240" className="tg-jar-svg">
      <defs>
        <clipPath id={`${id}-inside`}>
          <path d={body} />
        </clipPath>
        <linearGradient id={`${id}-gold`} x1="0" x2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="60%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <pattern
          id={`${id}-coins`}
          width="26"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <ellipse cx="7" cy="7" rx="11" ry="5" fill="#f59e0b" />
          <ellipse
            cx="7"
            cy="6"
            rx="11"
            ry="5"
            fill="#fcd34d"
            stroke="#b45309"
          />
          <ellipse cx="20" cy="14" rx="11" ry="5" fill="#f59e0b" />
          <ellipse
            cx="20"
            cy="13"
            rx="11"
            ry="5"
            fill="#fde68a"
            stroke="#b45309"
          />
        </pattern>
      </defs>

      <g clipPath={`url(#${id}-inside)`}>
        <rect
          x="0"
          y="0"
          width="200"
          height="240"
          fill="rgb(255 255 255 / 0.08)"
        />
        <g className="tg-jar-fill">
          <rect
            x="20"
            y="40"
            width="160"
            height="200"
            fill={`url(#${id}-gold)`}
          />
          <rect
            x="20"
            y="40"
            width="160"
            height="200"
            fill={`url(#${id}-coins)`}
            opacity="0.85"
          />
          {/* The heap's uneven top. */}
          <path
            d="M20 46 Q40 34 60 44 T100 42 T140 44 T180 40 L180 56 L20 56 Z"
            fill="#fcd34d"
            stroke="#b45309"
            strokeWidth="1.5"
          />
        </g>
      </g>

      {/* Glass, rim and shine on top. */}
      <path
        d={body}
        fill="none"
        stroke="rgb(255 255 255 / 0.85)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M46 100 C46 84 54 74 64 70 L64 196 C54 196 46 190 46 180 Z"
        fill="rgb(255 255 255 / 0.28)"
      />
      <rect
        x="52"
        y="22"
        width="96"
        height="20"
        rx="10"
        fill="rgb(255 255 255 / 0.25)"
        stroke="rgb(255 255 255 / 0.9)"
        strokeWidth="5"
      />
    </svg>
  )
}
