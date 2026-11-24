import { cn } from "@workspace/ui/lib/utils"

/**
 * The moving picture in the middle of the voyage card, one per world.
 * `share` is how much of the week's chores are done (0–1).
 */
export type SceneProps = { share: number; arrived: boolean; goal: string }

/** Moves its child from the left edge to just before the goal. */
function Traveller({
  share,
  className,
  children,
}: {
  share: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="absolute inset-y-0 right-28 left-10">
      <div
        className={cn(
          "absolute -translate-x-1/2 transition-[left] duration-[1400ms] ease-[cubic-bezier(.3,.8,.3,1)]",
          className
        )}
        style={{ left: `${share * 100}%` }}
      >
        {children}
      </div>
    </div>
  )
}

function GoalTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -top-6 right-0 rounded-full bg-black/45 px-2 py-0.5 text-[0.65rem] font-black tracking-wider whitespace-nowrap text-white uppercase">
      {children}
    </span>
  )
}

/** A small treasure chest that pops open when the week is done. */
export function SmallChest({
  open,
  className,
}: {
  open: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 64 56"
      className={cn(
        open && "drop-shadow-[0_0_14px_rgb(251_191_36)]",
        open ? "game-bob" : "game-float",
        className
      )}
    >
      <rect
        x="6"
        y="24"
        width="52"
        height="28"
        rx="4"
        fill="#8a4b1c"
        stroke="#3d1e07"
        strokeWidth="2.5"
      />
      <rect
        x="6"
        y="34"
        width="52"
        height="5"
        fill="#f5b820"
        stroke="#3d1e07"
        strokeWidth="1.5"
      />
      {open && <ellipse cx="32" cy="25" rx="22" ry="5" fill="#fcd34d" />}
      <g
        className="transition-transform duration-500"
        style={{
          transformBox: "view-box",
          transformOrigin: "8px 24px",
          transform: open ? "rotate(-40deg)" : undefined,
        }}
      >
        <path
          d="M6 26 Q6 8 32 8 Q58 8 58 26 Z"
          fill="#a35a22"
          stroke="#3d1e07"
          strokeWidth="2.5"
        />
        <path d="M8 22 H56" stroke="#f5b820" strokeWidth="4" />
      </g>
      <rect
        x="27"
        y="30"
        width="10"
        height="12"
        rx="2"
        fill="#ffd84a"
        stroke="#3d1e07"
        strokeWidth="2"
      />
      <circle cx="32" cy="35" r="1.8" fill="#3d1e07" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Traktor: plough the field to the barn.                              */

export function FieldScene({ share, arrived, goal }: SceneProps) {
  return (
    <div aria-hidden className="relative mt-5 h-36">
      <div className="absolute top-0 left-[30%] h-5 w-20 animate-[game-drift_40s_linear_infinite] rounded-full bg-white/90" />
      <div className="absolute top-8 left-[58%] h-4 w-14 animate-[game-drift_55s_linear_infinite] rounded-full bg-white/80" />

      {/* Hills and the field, running to the card's edges. */}
      <div className="absolute inset-x-[-1.5rem] bottom-0 h-24 overflow-hidden">
        <div className="absolute bottom-8 -left-[10%] h-24 w-[60%] rounded-[50%_50%_0_0] bg-[#7fb04a]" />
        <div className="absolute bottom-8 left-[35%] h-20 w-[75%] rounded-[50%_50%_0_0] bg-[#6aa03b]" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[repeating-linear-gradient(90deg,#c9a94f_0_14px,#b8963f_14px_18px)]" />
        <div
          className="absolute bottom-0 left-0 h-10 bg-[repeating-linear-gradient(90deg,#6b4423_0_10px,#55341a_10px_16px)] transition-[width] duration-[1400ms] ease-[cubic-bezier(.3,.8,.3,1)]"
          style={{
            width: `calc(1.5rem + 2.5rem + ${share} * (100% - 3rem - 9.5rem))`,
          }}
        />
      </div>

      {/* The barn with the chest. */}
      <div className="absolute right-0 bottom-6">
        <GoalTag>{goal}</GoalTag>
        <svg viewBox="0 0 120 110" className="h-24 w-auto">
          <path
            d="M10 50 L60 14 L110 50 V108 H10Z"
            fill="#b8302a"
            stroke="#5a1410"
            strokeWidth="3"
          />
          <path
            d="M4 52 L60 10 L116 52"
            fill="none"
            stroke="#3b2a22"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect
            x="38"
            y="62"
            width="44"
            height="46"
            fill="#8e221d"
            stroke="#fff"
            strokeWidth="3"
          />
          <path
            d="M38 62 L82 108 M82 62 L38 108"
            stroke="#fff"
            strokeWidth="3"
          />
          <rect
            x="52"
            y="30"
            width="16"
            height="14"
            fill="#fff6dc"
            stroke="#5a1410"
            strokeWidth="2"
          />
        </svg>
        <SmallChest
          open={arrived}
          className="absolute -bottom-3 -left-9 h-10 w-auto"
        />
      </div>

      <Traveller share={share} className="bottom-5">
        <Tractor className="h-16 w-auto animate-[game-rumble_.45s_ease-in-out_infinite_alternate] drop-shadow-lg" />
      </Traveller>
    </div>
  )
}

function Tractor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 100" className={className}>
      <g fill="#d4d4d4">
        {[0, 0.55, 1.1].map((delay) => (
          <circle
            key={delay}
            cx="88"
            cy="16"
            r="5"
            className="game-puff"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </g>
      <rect x="85" y="20" width="6" height="26" rx="2" fill="#333" />
      <rect
        x="18"
        y="14"
        width="40"
        height="40"
        rx="4"
        fill="#c8372d"
        stroke="#5a1410"
        strokeWidth="2.5"
      />
      <rect
        x="24"
        y="20"
        width="28"
        height="18"
        rx="2"
        fill="#bfe6ff"
        stroke="#5a1410"
        strokeWidth="2"
      />
      <path
        d="M54 42 H112 Q118 42 118 50 V64 H54Z"
        fill="#c8372d"
        stroke="#5a1410"
        strokeWidth="2.5"
      />
      <rect x="100" y="46" width="14" height="6" fill="#f5b820" />
      <g className="game-wheel">
        <circle cx="38" cy="72" r="24" fill="#1d1d1d" />
        <circle cx="38" cy="72" r="10" fill="#f5b820" />
        <path
          d="M38 48 V58 M38 86 V96 M14 72 H24 M52 72 H62"
          stroke="#444"
          strokeWidth="5"
        />
      </g>
      <g className="game-wheel">
        <circle cx="104" cy="80" r="15" fill="#1d1d1d" />
        <circle cx="104" cy="80" r="6" fill="#f5b820" />
        <path
          d="M104 65 V71 M104 89 V95 M89 80 H95 M113 80 H119"
          stroke="#444"
          strokeWidth="4"
        />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Spindelhelt: swing over the rooftops to the tower.                   */

const SKYLINE = [56, 92, 70, 110, 62, 98, 78, 50, 104, 72, 60, 88]

export function CityScene({ share, arrived, goal }: SceneProps) {
  return (
    <div aria-hidden className="relative mt-5 h-40">
      <div className="absolute top-0 right-[22%] size-12 rounded-full bg-amber-50 shadow-[0_0_40px_rgb(254_243_199/0.6)]" />

      {/* Skyline, running to the card's edges. */}
      <div className="absolute inset-x-[-1.5rem] bottom-0 flex h-28 items-end">
        {SKYLINE.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-[#0a0c24] bg-[repeating-linear-gradient(90deg,#0a0c24_0_6px,transparent_6px_14px),repeating-linear-gradient(0deg,transparent_0_10px,rgb(255_220_120/0.35)_10px_14px)] even:opacity-90"
            style={{ height }}
          />
        ))}
      </div>

      {/* The tower with the chest on top. */}
      <div className="absolute right-2 bottom-0 flex flex-col items-center">
        <GoalTag>{goal}</GoalTag>
        <SmallChest open={arrived} className="relative z-10 -mb-1 h-9 w-auto" />
        <svg viewBox="0 0 60 120" className="h-28 w-auto">
          <path
            d="M8 24 L30 4 L52 24 V120 H8Z"
            fill="#05061a"
            stroke="#3b76ff"
            strokeWidth="2"
          />
          <g fill="#ffd970" opacity=".8">
            {Array.from({ length: 10 }, (_, i) => (
              <rect
                key={i}
                x={i % 2 ? 33 : 17}
                y={32 + Math.floor(i / 2) * 18}
                width="10"
                height="8"
              />
            ))}
          </g>
        </svg>
      </div>

      <Traveller
        share={share}
        className="top-[-1.25rem] h-[calc(100%+1.25rem)]"
      >
        <div className="h-full origin-top animate-[game-swing_2.2s_ease-in-out_infinite]">
          <WebSwinger className="h-full w-auto" />
        </div>
      </Traveller>
    </div>
  )
}

/** An original web-slinging hero hanging from a line. */
function WebSwinger({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 180"
      preserveAspectRatio="xMidYMin meet"
      className={className}
    >
      <line x1="30" y1="0" x2="34" y2="104" stroke="#fff" strokeWidth="1.6" />
      <g transform="translate(10 98)">
        <path
          d="M26 6 L24 -2"
          stroke="#e8263b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle
          cx="20"
          cy="14"
          r="10"
          fill="#e8263b"
          stroke="#05061a"
          strokeWidth="2"
        />
        <path d="M12 12 Q20 8 28 12 L27 16 Q20 13 13 16Z" fill="#fff" />
        <path
          d="M12 24 H28 L30 48 H10Z"
          fill="#3b76ff"
          stroke="#05061a"
          strokeWidth="2"
        />
        <path d="M16 24 H24 L25 48 H15Z" fill="#e8263b" />
        <path
          d="M12 28 L2 40"
          stroke="#e8263b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M14 48 L8 66 M26 48 L36 62"
          stroke="#3b76ff"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Wakeboard: get pulled across the lake to the island ramp.            */

export function LakeScene({ share, arrived, goal }: SceneProps) {
  return (
    <div aria-hidden className="relative mt-5 h-36">
      <div className="absolute top-0 left-1/2 size-16 rounded-full bg-[radial-gradient(#fff3c4,#ffd27a_60%,transparent_70%)]" />
      <span className="absolute top-3 left-[38%] animate-[game-drift_30s_linear_infinite] text-xs text-white/70">
        ︶ ︶
      </span>

      {/* The lake, running to the card's edges. */}
      <div className="absolute inset-x-[-1.5rem] bottom-0 h-14 overflow-hidden bg-[linear-gradient(#22d3ee,#0e7490)]">
        <div className="absolute inset-0 [width:200%] animate-[game-waves_6s_linear_infinite] bg-[repeating-radial-gradient(ellipse_40px_8px_at_20px_6px,rgb(255_255_255/0.35)_0_2px,transparent_3px_14px)] bg-[length:60px_22px]" />
        <div
          className="absolute bottom-5 left-0 h-5 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.8))] transition-[width] duration-[1400ms] ease-[cubic-bezier(.3,.8,.3,1)] [clip-path:polygon(0_45%,100%_0,100%_100%,0_55%)]"
          style={{
            width: `calc(1.5rem + 1rem + ${share} * (100% - 3rem - 9.5rem))`,
          }}
        />
      </div>

      {/* Island with ramp and chest. */}
      <div className="absolute right-0 bottom-3">
        <GoalTag>{goal}</GoalTag>
        <svg viewBox="0 0 170 120" className="h-24 w-auto">
          <path
            d="M0 112 L46 70 L54 70 L54 112Z"
            fill="#f2f2f2"
            stroke="#063b45"
            strokeWidth="3"
          />
          <ellipse
            cx="118"
            cy="108"
            rx="52"
            ry="14"
            fill="#f4d58d"
            stroke="#b8913f"
            strokeWidth="2"
          />
          <path
            d="M122 104 Q118 70 128 40"
            stroke="#7a4b23"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <g fill="#2fa65a">
            <path d="M128 40 Q104 28 92 46 Q112 38 128 42Z" />
            <path d="M128 40 Q150 22 166 38 Q146 34 128 42Z" />
            <path d="M128 40 Q120 14 136 6 Q130 24 130 40Z" />
            <path d="M128 40 Q154 46 160 64 Q142 48 128 42Z" />
          </g>
        </svg>
        <SmallChest
          open={arrived}
          className="absolute right-8 bottom-2 h-9 w-auto"
        />
      </div>

      <Traveller share={share} className="bottom-2">
        <BoatAndRider className="game-bob h-16 w-auto translate-x-[30%] drop-shadow-lg" />
      </Traveller>
    </div>
  )
}

function BoatAndRider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 90" className={className}>
      <path d="M44 44 L150 52" stroke="#063b45" strokeWidth="1.5" />
      <g transform="translate(130 36)">
        <path
          d="M0 22 H80 Q90 22 84 36 H8Z"
          fill="#fff"
          stroke="#063b45"
          strokeWidth="2.5"
        />
        <path d="M6 30 H82" stroke="#ff6b3d" strokeWidth="4" />
        <path
          d="M30 22 L40 8 H54 L50 22"
          fill="#bfe6ff"
          stroke="#063b45"
          strokeWidth="2"
        />
        <path d="M20 22 V4 H60" stroke="#063b45" strokeWidth="3" fill="none" />
      </g>
      <g transform="translate(14 22)">
        <ellipse
          cx="22"
          cy="52"
          rx="26"
          ry="5"
          fill="#ff6b3d"
          stroke="#063b45"
          strokeWidth="2"
          transform="rotate(-10 22 52)"
        />
        <circle
          cx="24"
          cy="6"
          r="7"
          fill="#f2c299"
          stroke="#063b45"
          strokeWidth="2"
        />
        <path
          d="M18 2 Q24 -4 31 3"
          stroke="#ff6b3d"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M24 13 L20 32"
          stroke="#0aa6b5"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M22 18 L32 22"
          stroke="#f2c299"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M20 32 L12 48 M20 32 L30 46"
          stroke="#063b45"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M4 74 q6 -10 14 -4 q6 -10 14 -2"
        stroke="#fff"
        strokeWidth="3"
        fill="none"
        opacity=".9"
      />
    </svg>
  )
}
