import * as React from "react"
import { Cell, Label, Pie, PieChart } from "recharts"

import type { ValueView } from "@/components/budget/view-toggle"
import { UNGROUPED } from "@/lib/budget"
import { formatMoney, formatPercent } from "@/lib/format"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"
import type { ChartConfig } from "@workspace/ui/components/chart"

// Categorical slots 1–6 of the data-viz palette (validated for colour vision
// deficiency in both themes), plus neutrals for the catch-all slices.
const SLOTS = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#008300", dark: "#0ca30c" },
] as const
const OTHER = { light: "#6f6e69", dark: "#8f8e88" }
const NEUTRAL = { light: "#b5b4ae", dark: "#55544f" }

const MAX_NAMED_SLICES = SLOTS.length
export const OTHER_GROUPS = "Other groups"

type Slice = { id: string; name: string; value: number; groups: Array<string> }

/**
 * Expenses per group as slices: the largest groups by name, the rest folded
 * into "Other groups", and "Ungrouped" last. Colours follow the group (its
 * position among all group names), never its size, so they stay put from
 * month to month.
 */
export function groupSlices(
  groups: Array<{ name: string; expenses: number }>,
  allGroupNames: Array<string>
): { slices: Array<Slice>; config: ChartConfig } {
  const named = groups
    .filter((g) => g.name !== UNGROUPED && g.expenses > 0)
    .sort((a, b) => b.expenses - a.expenses)
  const ungrouped = groups.find((g) => g.name === UNGROUPED && g.expenses > 0)

  // Few enough groups: every group keeps its own colour. Otherwise the
  // largest keep a colour (in name order) and the rest become "Other".
  const kept =
    allGroupNames.length <= MAX_NAMED_SLICES
      ? named
      : named.slice(0, MAX_NAMED_SLICES - 1)
  const colourOrder =
    allGroupNames.length <= MAX_NAMED_SLICES
      ? allGroupNames
      : kept.map((g) => g.name).sort((a, b) => a.localeCompare(b))
  const rest = named.filter((g) => !kept.includes(g))

  const slices: Array<Slice> = []
  const config: ChartConfig = {}
  // Draw in colour order so neighbouring slices are neighbouring palette slots.
  for (const name of colourOrder) {
    const group = kept.find((g) => g.name === name)
    if (!group) continue
    const id = `slot${colourOrder.indexOf(name) + 1}`
    slices.push({ id, name, value: group.expenses, groups: [name] })
    config[id] = {
      label: name,
      theme: SLOTS[colourOrder.indexOf(name)] ?? OTHER,
    }
  }
  if (rest.length > 0) {
    slices.push({
      id: "other",
      name: OTHER_GROUPS,
      value: rest.reduce((sum, g) => sum + g.expenses, 0),
      groups: rest.map((g) => g.name),
    })
    config.other = { label: OTHER_GROUPS, theme: OTHER }
  }
  if (ungrouped) {
    slices.push({
      id: "ungrouped",
      name: UNGROUPED,
      value: ungrouped.expenses,
      groups: [],
    })
    config.ungrouped = { label: UNGROUPED, theme: NEUTRAL }
  }
  return { slices, config }
}

/** Donut of expenses per group, with a legend listing amount and share. */
export function GroupPieChart({
  groups,
  allGroupNames,
  totalExpenses,
  view,
  periodLabel,
}: {
  groups: Array<{ name: string; expenses: number }>
  allGroupNames: Array<string>
  totalExpenses: number
  view: ValueView
  periodLabel: string
}) {
  const scope = React.useId().replace(/:/g, "")
  const { slices, config } = groupSlices(groups, allGroupNames)
  if (slices.length === 0 || totalExpenses <= 0) return null

  // The legend lives outside the chart container, so give the whole block its
  // own swatch colours (light and dark), keyed like the chart config.
  const swatchCss = (["light", "dark"] as const)
    .map((theme) => {
      const vars = Object.entries(config)
        .map(([id, item]) => `--swatch-${id}: ${item.theme?.[theme] ?? ""};`)
        .join(" ")
      const prefix = theme === "dark" ? ".dark " : ""
      return `${prefix}[data-group-pie="${scope}"] { ${vars} }`
    })
    .join("\n")

  const shareOf = (value: number) => formatPercent(value / totalExpenses)
  const primary = (value: number) =>
    view === "percent" ? shareOf(value) : formatMoney(value)
  const secondary = (value: number) =>
    view === "percent" ? formatMoney(value) : shareOf(value)

  return (
    <div
      data-group-pie={scope}
      className="grid items-center gap-6 md:grid-cols-[minmax(0,16rem)_1fr]"
    >
      <style>{swatchCss}</style>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square w-full max-w-64"
        role="img"
        aria-label={`Expenses by group in ${periodLabel}: ${slices
          .map((s) => `${s.name} ${shareOf(s.value)}`)
          .join(", ")}.`}
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="id"
                formatter={(value, _name, item) => {
                  const slice = item.payload as Slice
                  return (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="size-2.5 rounded-[2px]"
                          style={{ background: `var(--swatch-${slice.id})` }}
                        />
                        {slice.name}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatMoney(Number(value))} · {shareOf(Number(value))}
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 1.5 : 0}
            cornerRadius={4}
            stroke="var(--background)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.id} fill={`var(--color-${slice.id})`} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null
                const { cx, cy } = viewBox as { cx: number; cy: number }
                return (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={cx}
                      y={cy - 8}
                      className="fill-foreground text-base font-semibold tabular-nums"
                    >
                      {formatMoney(totalExpenses)}
                    </tspan>
                    <tspan
                      x={cx}
                      y={cy + 12}
                      className="fill-muted-foreground text-xs"
                    >
                      Expenses
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul
        className="flex flex-col gap-2 text-sm"
        aria-label="Expenses by group"
      >
        {[...slices]
          .sort((a, b) => b.value - a.value)
          .map((slice) => (
            <li key={slice.id} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1 size-3 shrink-0 rounded-[3px]"
                style={{ background: `var(--swatch-${slice.id})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{slice.name}</div>
                {slice.id === "other" && (
                  <div className="truncate text-xs text-muted-foreground">
                    {slice.groups.join(", ")}
                  </div>
                )}
              </div>
              <div className="text-right tabular-nums">
                <div className="font-medium">{primary(slice.value)}</div>
                <div className="text-xs text-muted-foreground">
                  {secondary(slice.value)}
                </div>
              </div>
            </li>
          ))}
      </ul>
    </div>
  )
}
