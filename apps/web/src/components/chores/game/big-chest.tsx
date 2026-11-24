import * as React from "react"

import { CoinBurst, PopConfetti } from "@/components/chores/game/celebrate"
import { cn } from "@workspace/ui/lib/utils"

export type ChestState = "closed" | "open" | "locked" | "claimed"

export type ChestReveal = {
  emoji: string
  title: string
  caption: string
}

function prefersLessMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * A big treasure chest. Open, it bursts apart: the lid flies up, light
 * pours out with coins and confetti, and the treasure rises out. Locked, it
 * rattles and stays shut.
 */
export function BigChest({
  state,
  reveal,
  className,
}: {
  state: ChestState
  reveal: ChestReveal | null
  className?: string
}) {
  const body = React.useRef<HTMLDivElement>(null)
  const [burst, setBurst] = React.useState(0)
  const previous = React.useRef<ChestState>(state)

  React.useEffect(() => {
    const was = previous.current
    previous.current = state
    const el = body.current
    if (!el || state === was) return
    const isOpen = state === "open" || state === "claimed"
    const wasOpen = was === "open" || was === "claimed"
    if (isOpen && (!wasOpen || state === "claimed")) setBurst((n) => n + 1)
    if (prefersLessMotion()) return
    if (isOpen && !wasOpen) {
      // Squash, then spring up as the lid bursts open.
      el.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.12, 0.86) translateY(8px)", offset: 0.25 },
          { transform: "scale(0.94, 1.1) translateY(-14px)", offset: 0.55 },
          { transform: "scale(1, 1)" },
        ],
        { duration: 550, easing: "ease-out" }
      )
    } else if (state === "locked") {
      el.animate(
        [
          { transform: "rotate(0)" },
          { transform: "translateX(-8px) rotate(-4deg)" },
          { transform: "translateX(8px) rotate(4deg)" },
          { transform: "translateX(-6px) rotate(-3deg)" },
          { transform: "translateX(5px) rotate(2deg)" },
          { transform: "rotate(0)" },
        ],
        { duration: 500, easing: "ease-in-out" }
      )
    }
  }, [state])

  const isOpen = state === "open" || state === "claimed"

  return (
    <div
      data-state={state}
      className={cn("chest relative mx-auto h-96 w-full max-w-md", className)}
    >
      {/* Light pouring out of the chest. */}
      <div
        aria-hidden
        className="chest-rays absolute top-[62%] left-1/2 size-[30rem] rounded-full"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgb(253 224 71 / 0.55) 0deg 7deg, transparent 7deg 22deg)",
          maskImage: "radial-gradient(circle, black 15%, transparent 65%)",
          WebkitMaskImage:
            "radial-gradient(circle, black 15%, transparent 65%)",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        aria-hidden
        className="chest-glow absolute top-[60%] left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/60 blur-3xl"
      />

      {/* Idle sparkles. */}
      {!isOpen &&
        [
          [18, 30, 0],
          [80, 24, 0.7],
          [12, 70, 1.4],
          [88, 66, 0.3],
          [50, 12, 1.1],
        ].map(([left, top, delay]) => (
          <span
            key={`${left}-${top}`}
            aria-hidden
            className="game-twinkle absolute text-lg text-amber-200"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
            }}
          >
            ✦
          </span>
        ))}

      {/* What's inside, rising out of the chest. */}
      {reveal && (
        <div
          key={`${reveal.title}-${state}`}
          className={cn(
            "absolute top-4 left-1/2 z-20 flex w-max max-w-[18rem] flex-col items-center gap-1 text-center",
            isOpen ? "game-reveal" : "-translate-x-1/2"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "text-6xl drop-shadow-[0_0_24px_rgb(253_224_71)]",
              isOpen && "game-float"
            )}
          >
            {reveal.emoji}
          </span>
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-lg font-black shadow-lg ring-2",
              isOpen
                ? "bg-amber-300 text-amber-950 ring-amber-100"
                : "bg-zinc-900/80 text-white ring-white/20"
            )}
          >
            {reveal.title}
          </span>
          <span className="text-sm font-semibold text-white/90 drop-shadow">
            {reveal.caption}
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div
          ref={body}
          className={cn(
            "relative",
            !isOpen && state !== "locked" && "game-float"
          )}
        >
          <CoinBurst play={burst} />
          <PopConfetti play={burst} />
          <ChestSvg locked={state === "locked"} />
        </div>
      </div>
    </div>
  )
}

function ChestSvg({ locked }: { locked: boolean }) {
  const id = React.useId()
  const wood = `${id}-wood`
  const gold = `${id}-gold`
  const lidClip = `${id}-lid`
  const LID = "M30 112 V82 Q30 36 130 36 Q230 36 230 82 V112 Z"
  return (
    <svg
      viewBox="0 0 260 215"
      role="img"
      aria-label={locked ? "En låst skattekiste" : "En skattekiste"}
      className="w-72 overflow-visible drop-shadow-[0_18px_24px_rgb(0_0_0/0.45)] sm:w-80"
    >
      <defs>
        <linearGradient id={wood} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <clipPath id={lidClip}>
          <path d={LID} />
        </clipPath>
      </defs>

      {/* Inside: darkness, a heap of gold, and its glow. */}
      <ellipse cx="130" cy="112" rx="98" ry="16" fill="#1c0a00" />
      {[
        [70, 108],
        [92, 102],
        [114, 98],
        [138, 97],
        [162, 101],
        [186, 107],
        [104, 106],
        [150, 105],
        [126, 104],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="9"
          fill={`url(#${gold})`}
          stroke="#92400e"
          strokeWidth="1.5"
        />
      ))}
      <path
        d="M118 92 l6 -12 l6 12 l-6 6 z"
        fill="#e879f9"
        stroke="#a21caf"
        strokeWidth="1.5"
      />

      {/* The box. */}
      <rect
        x="30"
        y="110"
        width="200"
        height="90"
        rx="10"
        fill={`url(#${wood})`}
        stroke="#451a03"
        strokeWidth="4"
      />
      <path
        d="M34 140 H226 M34 170 H226"
        stroke="#451a03"
        strokeWidth="2"
        opacity="0.45"
      />
      <rect
        x="58"
        y="110"
        width="16"
        height="90"
        fill={`url(#${gold})`}
        stroke="#92400e"
        strokeWidth="1.5"
      />
      <rect
        x="186"
        y="110"
        width="16"
        height="90"
        fill={`url(#${gold})`}
        stroke="#92400e"
        strokeWidth="1.5"
      />
      <rect
        x="24"
        y="194"
        width="212"
        height="13"
        rx="5"
        fill={`url(#${gold})`}
        stroke="#92400e"
        strokeWidth="1.5"
      />
      {[66, 194].flatMap((x) =>
        [124, 150, 176].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#78350f" />
        ))
      )}

      {/* The lid. */}
      <g className="chest-lid">
        <path d={LID} fill={`url(#${wood})`} stroke="#451a03" strokeWidth="4" />
        <g clipPath={`url(#${lidClip})`}>
          <path
            d="M34 70 Q130 52 226 70"
            stroke="#451a03"
            strokeWidth="2"
            fill="none"
            opacity="0.45"
          />
          <rect
            x="58"
            y="30"
            width="16"
            height="90"
            fill={`url(#${gold})`}
            stroke="#92400e"
            strokeWidth="1.5"
          />
          <rect
            x="186"
            y="30"
            width="16"
            height="90"
            fill={`url(#${gold})`}
            stroke="#92400e"
            strokeWidth="1.5"
          />
        </g>
        <rect
          x="24"
          y="102"
          width="212"
          height="13"
          rx="5"
          fill={`url(#${gold})`}
          stroke="#92400e"
          strokeWidth="1.5"
        />
      </g>

      {/* The lock. */}
      <g>
        <rect
          x="112"
          y="100"
          width="36"
          height="44"
          rx="7"
          fill={`url(#${gold})`}
          stroke="#92400e"
          strokeWidth="2"
        />
        {locked ? (
          <path
            d="M121 116 l18 18 M139 116 l-18 18"
            stroke="#b91c1c"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : (
          <>
            <circle cx="130" cy="118" r="5" fill="#451a03" />
            <rect
              x="128"
              y="120"
              width="4"
              height="12"
              rx="1.5"
              fill="#451a03"
            />
          </>
        )}
      </g>
    </svg>
  )
}
