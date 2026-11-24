import { CoinsIcon, GemIcon, SkullIcon } from "lucide-react"

import { GoldCoin } from "@/components/chores/game/gold-coin"
import { cn } from "@workspace/ui/lib/utils"

const count = new Intl.NumberFormat("da-DK")

/** "1.250 doubloons" */
export function formatDoubloons(amount: number): string {
  return `${count.format(amount)} ${amount === 1 ? "dublon" : "dubloner"}`
}

/** An amount of doubloons with the coin icon. */
export function Doubloons({
  amount,
  className,
  short = false,
}: {
  amount: number
  className?: string
  /** Only the number next to the coin; the full text is kept for screen readers. */
  short?: boolean
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular-nums", className)}
    >
      <CoinsIcon
        aria-hidden
        className="size-[1em] shrink-0 text-amber-600 dark:text-amber-400"
      />
      {short ? (
        <>
          <span aria-hidden>{count.format(amount)}</span>
          <span className="sr-only">{formatDoubloons(amount)}</span>
        </>
      ) : (
        formatDoubloons(amount)
      )}
    </span>
  )
}

/**
 * A change to a purse: "+15" with a coin when earned, a red skull and "−12"
 * when lost to an undone chore, a gem and "−50" when spent on a treasure.
 */
export function DoubloonChange({
  amount,
  kind,
  className,
}: {
  amount: number
  kind?: "reward" | "penalty" | "purchase"
  className?: string
}) {
  const spent = kind === "purchase"
  const lost = amount < 0 && !spent
  const Icon = spent ? GemIcon : SkullIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        lost && "text-destructive",
        className
      )}
    >
      {lost || spent ? (
        <Icon
          aria-hidden
          className={cn(
            "size-[1em] shrink-0",
            spent && "text-violet-600 dark:text-violet-400"
          )}
        />
      ) : (
        <GoldCoin />
      )}
      <span aria-hidden>
        {amount < 0 ? "\u2212" : "+"}
        {count.format(Math.abs(amount))}
      </span>
      <span className="sr-only">
        {spent ? "Brugt" : lost ? "Tabt" : "Tjent"}{" "}
        {formatDoubloons(Math.abs(amount))}
      </span>
    </span>
  )
}
