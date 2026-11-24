import * as React from "react"

import { GoldCoin } from "@/components/chores/game/gold-coin"

function prefersLessMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Coins flying out from the middle of the parent (which should be
 * `relative`), with "+N" floating up. Plays each time `play` goes up.
 */
export function CoinBurst({ play, amount }: { play: number; amount?: number }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const root = ref.current
    if (!play || !root || prefersLessMotion()) return
    const coins = Array.from(root.querySelectorAll<HTMLElement>("[data-coin]"))
    const animations = coins.map((coin, i) => {
      const angle = (i / coins.length) * Math.PI * 2 + Math.random() * 0.5
      const distance = 60 + Math.random() * 60
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance - 40
      return coin.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.3)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.1) rotate(${x * 5}deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(calc(-50% + ${x * 1.15}px), calc(-50% + ${y + 60}px)) scale(0.7)`,
            opacity: 0,
          },
        ],
        {
          duration: 1000 + Math.random() * 400,
          easing: "cubic-bezier(.2,.7,.3,1)",
        }
      )
    })
    const label = root.querySelector<HTMLElement>("[data-label]")
    if (label) {
      animations.push(
        label.animate(
          [
            { transform: "translate(-50%, -20%) scale(0.6)", opacity: 0 },
            {
              transform: "translate(-50%, -80%) scale(1.25)",
              opacity: 1,
              offset: 0.25,
            },
            { transform: "translate(-50%, -260%) scale(1)", opacity: 0 },
          ],
          { duration: 1500, easing: "ease-out" }
        )
      )
    }
    return () => animations.forEach((a) => a.cancel())
  }, [play])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          data-coin
          className="absolute top-1/2 left-1/2 text-2xl opacity-0"
        >
          <GoldCoin />
        </span>
      ))}
      {amount ? (
        <span
          data-label
          className="absolute top-1/2 left-1/2 text-3xl font-black whitespace-nowrap text-amber-400 opacity-0 [text-shadow:0_2px_0_rgb(120_53_15),0_0_18px_rgb(251_191_36/0.8)]"
        >
          +{amount}
        </span>
      ) : null}
    </div>
  )
}

const CONFETTI_COLORS = [
  "#f43f5e",
  "#f59e0b",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#d946ef",
]

/**
 * Confetti raining down over the whole screen. Plays each time `play` goes
 * up.
 */
export function Confetti({ play }: { play: number }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const root = ref.current
    if (!play || !root || prefersLessMotion()) return
    const pieces: Array<HTMLElement> = []
    for (let i = 0; i < 110; i++) {
      const piece = document.createElement("span")
      const size = 6 + Math.random() * 8
      Object.assign(piece.style, {
        position: "absolute",
        top: "-20px",
        left: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size * (0.4 + Math.random() * 0.8)}px`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        borderRadius: Math.random() > 0.6 ? "999px" : "2px",
      })
      root.appendChild(piece)
      pieces.push(piece)
      const drift = (Math.random() - 0.5) * 240
      piece
        .animate(
          [
            { transform: "translate(0, 0) rotate(0)", opacity: 1 },
            {
              transform: `translate(${drift}px, 105vh) rotate(${720 + Math.random() * 720}deg)`,
              opacity: 0.9,
            },
          ],
          {
            duration: 2200 + Math.random() * 1800,
            delay: Math.random() * 500,
            easing: "cubic-bezier(.25,.6,.4,1)",
            fill: "backwards",
          }
        )
        .finished.then(() => piece.remove())
        .catch(() => piece.remove())
    }
    return () => pieces.forEach((p) => p.remove())
  }, [play])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    />
  )
}

/**
 * Confetti popping out from the middle of the parent (which should be
 * `relative`) and falling down. Plays each time `play` goes up.
 */
export function PopConfetti({
  play,
  count = 70,
}: {
  play: number
  count?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const root = ref.current
    if (!play || !root || prefersLessMotion()) return
    const pieces: Array<HTMLElement> = []
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span")
      const size = 5 + Math.random() * 7
      Object.assign(piece.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: `${size}px`,
        height: `${size * (0.4 + Math.random() * 0.8)}px`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        borderRadius: Math.random() > 0.6 ? "999px" : "2px",
      })
      root.appendChild(piece)
      pieces.push(piece)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4
      const power = 120 + Math.random() * 180
      const x = Math.cos(angle) * power
      const y = Math.sin(angle) * power
      piece
        .animate(
          [
            { transform: "translate(-50%, -50%) rotate(0)", opacity: 1 },
            {
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${360 + Math.random() * 360}deg)`,
              opacity: 1,
              offset: 0.4,
            },
            {
              transform: `translate(calc(-50% + ${x * 1.3}px), calc(-50% + ${y + 260}px)) rotate(${720 + Math.random() * 360}deg)`,
              opacity: 0,
            },
          ],
          {
            duration: 1600 + Math.random() * 900,
            easing: "cubic-bezier(.15,.7,.4,1)",
          }
        )
        .finished.then(() => piece.remove())
        .catch(() => piece.remove())
    }
    return () => pieces.forEach((p) => p.remove())
  }, [play, count])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
    />
  )
}

/** Counts smoothly from the old number to the new one. */
export function useCountUp(value: number, duration = 800): number {
  const [shown, setShown] = React.useState(value)
  const current = React.useRef(value)

  React.useEffect(() => {
    const from = current.current
    if (from === value) return
    if (prefersLessMotion()) {
      current.current = value
      setShown(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const next = Math.round(from + (value - from) * (1 - (1 - t) ** 3))
      current.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return shown
}

/** A number that counts up or down when it changes. */
export function CountUp({ value }: { value: number }) {
  const shown = useCountUp(value)
  return <>{new Intl.NumberFormat("da-DK").format(shown)}</>
}
