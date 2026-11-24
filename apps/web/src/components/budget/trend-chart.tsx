import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { formatMoney } from "@/lib/format"
import { Button } from "@workspace/ui/components/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"
import type { ChartConfig } from "@workspace/ui/components/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

// Categorical slots 1 and 2 of the data-viz palette, validated for colour
// vision deficiency in both themes.
const chartConfig = {
  income: { label: "Income", theme: { light: "#2a78d6", dark: "#3987e5" } },
  expenses: { label: "Expenses", theme: { light: "#eb6834", dark: "#d95926" } },
} satisfies ChartConfig

type Point = {
  key: string
  label: string
  fullLabel: string
  hasData: boolean
  income: number
  expenses: number
  net: number
}

const compact = new Intl.NumberFormat("da-DK", {
  notation: "compact",
  maximumFractionDigits: 0,
})

/** Income and expenses per period, oldest to newest. */
export function TrendChart({
  data,
  activeKey,
}: {
  data: Array<Point>
  activeKey: string
}) {
  const [asTable, setAsTable] = React.useState(false)
  // Skip leading periods from before the first import.
  const firstWithData = data.findIndex((d) => d.hasData)
  const points = firstWithData === -1 ? data : data.slice(firstWithData)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="xs"
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? "Show chart" : "Show table"}
        </Button>
      </div>

      {asTable ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Left over</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((p) => (
                <TableRow
                  key={p.key}
                  data-state={p.key === activeKey ? "selected" : undefined}
                >
                  <TableCell>{p.fullLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.hasData ? formatMoney(p.income) : "–"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.hasData ? formatMoney(p.expenses) : "–"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.hasData ? formatMoney(p.net) : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full"
          role="img"
          aria-label={`Income and expenses from ${points[0]?.fullLabel ?? ""} to ${points.at(-1)?.fullLabel ?? ""}. Use "Show table" for the numbers.`}
        >
          <BarChart data={points} barGap={2} barCategoryGap="30%">
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => compact.format(value)}
            />
            <ChartTooltip
              cursor={{ fillOpacity: 0.4 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    (payload[0]?.payload as Point | undefined)?.fullLabel ?? ""
                  }
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="size-2.5 rounded-[2px]"
                          style={{ background: `var(--color-${String(name)})` }}
                        />
                        {chartConfig[name as keyof typeof chartConfig].label}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatMoney(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="expenses"
              fill="var(--color-expenses)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}
