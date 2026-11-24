import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import type { ValueView } from "@/components/budget/view-toggle"
import { formatMoney, formatPercent } from "@/lib/format"
import { relativeChange } from "@/lib/period"
import { cn } from "@workspace/ui/lib/utils"

/**
 * "↑ +12% vs September 2026". The arrow is green when the change is good for
 * the family (more income, less spending) and red when it isn't; the sign and
 * the words carry the meaning too, so it never relies on colour alone.
 */
export function Trend({
  current,
  previous,
  goodWhen,
  view,
  previousLabel,
  className,
}: {
  current: number
  previous: number | null
  goodWhen: "up" | "down"
  view: ValueView
  previousLabel?: string
  className?: string
}) {
  const suffix = previousLabel ? ` vs ${previousLabel}` : ""

  if (previous === null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {previousLabel ? `No data for ${previousLabel}` : "–"}
      </span>
    )
  }

  const diff = current - previous
  const change = relativeChange(current, previous)
  const flat = Math.abs(diff) < 0.005
  const good = goodWhen === "up" ? diff > 0 : diff < 0
  const Icon = flat ? MinusIcon : diff > 0 ? TrendingUpIcon : TrendingDownIcon

  const value =
    view === "percent"
      ? change === null
        ? "new"
        : formatPercent(change, { sign: true })
      : `${diff > 0 ? "+" : ""}${formatMoney(diff)}`

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground",
        className
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0",
          flat
            ? "text-muted-foreground"
            : good
              ? "text-[#0ca30c]"
              : "text-[#d03b3b]"
        )}
      />
      <span className="font-medium text-foreground tabular-nums">
        {flat ? "No change" : value}
      </span>
      {suffix && <span>{suffix}</span>}
      {!flat && (
        <span className="sr-only">{good ? "(better)" : "(worse)"}</span>
      )}
    </span>
  )
}
