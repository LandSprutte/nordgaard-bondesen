import type { Member } from "@/components/chores/member-avatar"
import { CountUp } from "@/components/chores/game/celebrate"
import { addDays, daysLeft, formatWeek, weekNumber } from "@/lib/chores"
import { GoldCoin } from "@/components/chores/game/gold-coin"
import { cn } from "@workspace/ui/lib/utils"
import { useVoyageTheme } from "@/components/chores/game/themes"
import type { ThemeId } from "@/components/chores/game/themes"
import type { SceneProps } from "@/components/chores/game/voyage-scenes"
import {
  CityScene,
  FieldScene,
  LakeScene,
} from "@/components/chores/game/voyage-scenes"

const DAY_LETTERS = ["M", "T", "O", "T", "F", "L", "S"]

/**
 * The week as a voyage: the ship sails towards treasure island as chores
 * get done, over a bar coloured by who did them.
 */
export function Voyage({
  week,
  today,
  total,
  done,
  upForGrabs,
}: {
  week: string
  today: string
  total: number
  /** Finished chores per member, in the order to show them. */
  done: Array<{ member: Member; count: number }>
  /** Doubloons still to earn this week. */
  upForGrabs: number
}) {
  const finished = done.reduce((sum, d) => sum + d.count, 0)
  const share = total === 0 ? 0 : finished / total
  const arrived = total > 0 && finished === total
  const left = daysLeft(week, today)
  const theme = useVoyageTheme()
  const Scene = SCENES[theme.id]

  return (
    <section
      aria-label="Ugens togt"
      className={cn(
        "game-rise relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-xl sm:p-6",
        arrived ? theme.backgroundArrived : theme.background
      )}
    >
      {(theme.id === "pirat" || theme.id === "spindelhelt") && <Sky />}

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "text-xs font-semibold tracking-[0.2em] uppercase",
              theme.eyebrow
            )}
          >
            Uge {weekNumber(week)} · {formatWeek(week)}
          </p>
          <h2 className="text-2xl font-black tracking-tight drop-shadow sm:text-3xl">
            {arrived
              ? theme.headline.arrived
              : total === 0
                ? theme.headline.empty
                : finished === 0
                  ? theme.headline.start
                  : share >= 0.5
                    ? theme.headline.halfway
                    : theme.headline.underway}
          </h2>
          <p className="text-sm text-white/75">
            {arrived ? theme.arrivedText : theme.warning}
          </p>
        </div>
        <DayTracker week={week} today={today} />
      </div>

      <Scene share={share} arrived={arrived} goal={theme.goal} />

      <ProgressBar total={total} done={done} />

      <dl className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Tjanser klaret">
          <CountUp value={finished} />
          <span className="text-white/50">/{total}</span>
        </Stat>
        <Stat label="Til fri plyndring">
          <GoldCoin className="mr-1" />
          <CountUp value={upForGrabs} />
        </Stat>
        <Stat
          label={left === 1 ? "Sidste dag!" : "Dage tilbage"}
          warn={left <= 2}
        >
          ⏳ {left}
        </Stat>
      </dl>
    </section>
  )
}

function Stat({
  label,
  warn,
  children,
}: {
  label: string
  warn?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15 backdrop-blur-sm",
        warn && "bg-rose-500/25 ring-rose-300/40"
      )}
    >
      <dd className="text-xl font-black tabular-nums sm:text-2xl">
        {children}
      </dd>
      <dt className="text-[0.7rem] font-semibold tracking-wider text-white/70 uppercase">
        {label}
      </dt>
    </div>
  )
}

function DayTracker({ week, today }: { week: string; today: string }) {
  return (
    <ol className="flex gap-1.5" aria-label="Ugens dage">
      {DAY_LETTERS.map((letter, i) => {
        const date = addDays(week, i)
        const past = date < today
        const isToday = date === today
        return (
          <li
            key={date}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-xs font-bold ring-1",
              past && "bg-white/10 text-white/40 ring-white/10",
              isToday &&
                "game-glow scale-110 bg-amber-400 text-amber-950 ring-amber-200",
              !past && !isToday && "bg-white/15 text-white ring-white/25"
            )}
          >
            {letter}
          </li>
        )
      })}
    </ol>
  )
}

/** Twinkling stars. */
function Sky() {
  const stars = [
    [8, 12, 0],
    [22, 30, 0.8],
    [38, 8, 1.6],
    [55, 22, 0.4],
    [68, 10, 1.2],
    [82, 28, 2],
    [93, 14, 0.6],
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {stars.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className="game-twinkle absolute text-xs text-amber-100"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${delay}s`,
          }}
        >
          ✦
        </span>
      ))}
      <div className="absolute -top-24 -right-16 size-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-10 size-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
    </div>
  )
}

const SCENES: Record<ThemeId, (props: SceneProps) => React.ReactNode> = {
  pirat: Sea,
  traktor: FieldScene,
  spindelhelt: CityScene,
  wakeboard: LakeScene,
}

/** The ship sailing over animated waves towards the island. */
function Sea({ share, arrived }: SceneProps) {
  return (
    <div aria-hidden className="relative mt-5 h-32">
      {/* The route still to sail. */}
      <div className="absolute inset-x-8 top-[58%] border-t-2 border-dashed border-white/30" />

      {/* Treasure island. */}
      <div className="absolute right-0 bottom-6 flex flex-col items-center">
        <span
          className={cn(
            "text-3xl",
            arrived
              ? "game-bob drop-shadow-[0_0_14px_rgb(251_191_36)]"
              : "game-float"
          )}
        >
          {arrived ? "💰" : "🏴‍☠️"}
        </span>
        <span className="-mt-1 text-4xl">🏝️</span>
      </div>

      {/* The ship. */}
      <div className="absolute inset-y-0 right-20 left-8">
        <div
          className="absolute bottom-7 -translate-x-1/2 transition-[left] duration-[1400ms] ease-[cubic-bezier(.3,.8,.3,1)]"
          style={{ left: `${share * 100}%` }}
        >
          <Ship className="game-bob size-16 drop-shadow-lg" />
        </div>
      </div>

      <Waves />
    </div>
  )
}

function Ship({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className}>
      <rect x="31" y="6" width="2.5" height="36" rx="1" fill="#3f2a14" />
      <path d="M34 8 C50 14 50 30 34 36 Z" fill="#fef3c7" />
      <path d="M31 12 L14 34 H31 Z" fill="#fde68a" />
      <path d="M33.5 5 H45 L42 8 L45 11 H33.5 Z" fill="#111827" />
      <circle cx="38.5" cy="8" r="1.6" fill="#f9fafb" />
      <path d="M4 40 H60 L52 54 Q32 58 12 54 Z" fill="#92400e" />
      <path d="M6 43 H58" stroke="#78350f" strokeWidth="2" />
      <circle cx="20" cy="47" r="2" fill="#fbbf24" />
      <circle cx="32" cy="48" r="2" fill="#fbbf24" />
      <circle cx="44" cy="47" r="2" fill="#fbbf24" />
    </svg>
  )
}

const WAVE =
  "M0 20 Q 75 0 150 20 T 300 20 T 450 20 T 600 20 T 750 20 T 900 20 T 1050 20 T 1200 20 V40 H0 Z"

function Waves() {
  return (
    <div className="absolute inset-x-[-1.5rem] bottom-0 h-12 overflow-hidden">
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        className="absolute bottom-1 h-10 w-[200%] animate-[game-waves_9s_linear_infinite] fill-cyan-300/30"
      >
        <path d={WAVE} />
      </svg>
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        className="absolute -bottom-1 h-9 w-[200%] animate-[game-waves_6s_linear_infinite_reverse] fill-sky-400/40"
      >
        <path d={WAVE} />
      </svg>
    </div>
  )
}

function ProgressBar({
  total,
  done,
}: {
  total: number
  done: Array<{ member: Member; count: number }>
}) {
  const finished = done.reduce((sum, d) => sum + d.count, 0)
  return (
    <div className="relative">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={finished}
        aria-label={`${finished} af ${total} tjanser klaret`}
        className="flex h-5 w-full overflow-hidden rounded-full bg-black/30 p-0.5 ring-1 ring-white/20"
      >
        {total > 0 &&
          done
            .filter((d) => d.count > 0)
            .map(({ member, count }) => (
              <div
                key={member.id}
                title={`${member.name}: ${count}`}
                className="game-shine relative h-full overflow-hidden border-r-2 border-black/20 transition-[width] duration-1000 ease-out first:rounded-l-full last:rounded-r-full last:border-r-0"
                style={{
                  width: `${(count / total) * 100}%`,
                  backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${member.color} 70%, white), ${member.color})`,
                }}
              />
            ))}
      </div>
      {done.some((d) => d.count > 0) && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/80">
          {done
            .filter((d) => d.count > 0)
            .map(({ member, count }) => (
              <li key={member.id} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                {member.name} · {count}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
