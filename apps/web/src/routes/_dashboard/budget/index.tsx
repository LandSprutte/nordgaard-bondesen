import { Link, createFileRoute } from "@tanstack/react-router"
import {
  AlertCircleIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from "lucide-react"
import { z } from "zod"

import { AccountNumber } from "@/components/budget/account-number"
import { NoDataYet } from "@/components/budget/empty-state"
import { PageHeader } from "@/components/budget/page-header"
import { PeriodPicker } from "@/components/budget/period-picker"
import { Trend } from "@/components/budget/trend"
import { GroupPieChart } from "@/components/budget/group-pie-chart"
import { TrendChart } from "@/components/budget/trend-chart"
import { ViewToggle } from "@/components/budget/view-toggle"
import type { ValueView } from "@/components/budget/view-toggle"
import { formatMoney, formatPercent } from "@/lib/format"
import { periodSearchParam, share } from "@/lib/period"
import { getBudgetSummary } from "@/server/budget"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export const Route = createFileRoute("/_dashboard/budget/")({
  validateSearch: z.object({
    period: periodSearchParam,
    view: z.enum(["amount", "percent"]).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ period: search.period }),
  loader: ({ deps }) => getBudgetSummary({ data: deps }),
  component: BudgetSummary,
})

type Summary = Awaited<ReturnType<typeof getBudgetSummary>>

function BudgetSummary() {
  const summary = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const view: ValueView = search.view ?? "amount"
  const { period, totals, previousTotals, previousLabel } = summary

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Budget"
        description={`Money in and out for ${summary.label}`}
      >
        <PeriodPicker
          period={period}
          periods={summary.periods}
          onChange={(p) =>
            navigate({ search: (prev) => ({ ...prev, period: p }) })
          }
        />
        <ViewToggle
          view={view}
          onChange={(v) =>
            navigate({
              search: (prev) => ({
                ...prev,
                view: v === "amount" ? undefined : v,
              }),
              replace: true,
            })
          }
        />
      </PageHeader>

      {summary.unmappedKeys > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
          <AlertCircleIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            {summary.unmappedKeys} bank texts don&apos;t have a name or category
            yet.
          </span>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link to="/settings/budget" />}
          >
            Name them
          </Button>
        </div>
      )}

      {!summary.hasData ? (
        <NoDataYet />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Income"
              value={formatMoney(totals.income)}
              trend={
                <Trend
                  current={totals.income}
                  previous={previousTotals?.income ?? null}
                  previousLabel={previousLabel}
                  goodWhen="up"
                  view={view}
                />
              }
              link={{ to: "/budget/income", period }}
            />
            <StatCard
              title="Expenses"
              value={
                view === "percent"
                  ? ofIncome(totals.expenses, totals.income)
                  : formatMoney(totals.expenses)
              }
              trend={
                <Trend
                  current={totals.expenses}
                  previous={previousTotals?.expenses ?? null}
                  previousLabel={previousLabel}
                  goodWhen="down"
                  view={view}
                />
              }
              link={{ to: "/budget/expenses", period }}
            />
            <StatCard
              title="Left over"
              value={
                view === "percent"
                  ? ofIncome(totals.net, totals.income)
                  : formatMoney(totals.net)
              }
              trend={
                <Trend
                  current={totals.net}
                  previous={previousTotals?.net ?? null}
                  previousLabel={previousLabel}
                  goodWhen="up"
                  view={view}
                />
              }
              hint={`${formatMoney(totals.transfers)} moved between your own accounts`}
            />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Trend</h2>
            <Card>
              <CardContent>
                <TrendChart data={summary.history} activeKey={period} />
              </CardContent>
            </Card>
          </section>

          <Accounts summary={summary} view={view} />
          <Groups summary={summary} view={view} />
          <Categories summary={summary} view={view} />
        </>
      )}
    </div>
  )
}

function ofIncome(value: number, income: number) {
  const s = share(value, income)
  return s === null ? "–" : `${formatPercent(s)} of income`
}

function Accounts({ summary, view }: { summary: Summary; view: ValueView }) {
  const { period } = summary
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Accounts</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.accounts.map((account) => (
          <Card key={account.number} size="sm">
            <CardHeader>
              <CardTitle>{account.name ?? "Unnamed account"}</CardTitle>
              <CardDescription>
                <AccountNumber number={account.number} />
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl font-semibold tabular-nums">
                  {account.balance === null
                    ? "–"
                    : formatMoney(account.balance)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Balance at the end of {summary.label}
                </div>
                {account.balance !== null && (
                  <Trend
                    current={account.balance}
                    previous={account.previousBalance}
                    previousLabel={summary.previousLabel}
                    goodWhen="up"
                    view={view}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link
                  to="/budget/income"
                  search={{ period, account: account.number, transfers: true }}
                  className="flex items-center gap-1.5 rounded-md hover:underline"
                  aria-label={`Money in: ${formatMoney(account.in)}`}
                >
                  <ArrowDownLeftIcon className="size-4 text-[#0ca30c]" />
                  <span className="tabular-nums">
                    {formatMoney(account.in)}
                  </span>
                </Link>
                <Link
                  to="/budget/expenses"
                  search={{ period, account: account.number, transfers: true }}
                  className="flex items-center gap-1.5 rounded-md hover:underline"
                  aria-label={`Money out: ${formatMoney(account.out)}`}
                >
                  <ArrowUpRightIcon className="size-4 text-[#d03b3b]" />
                  <span className="tabular-nums">
                    {formatMoney(account.out)}
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

type BreakdownRow = {
  name: string
  income: number
  expenses: number
  previousIncome: number | null
  previousExpenses: number | null
}

function Groups({ summary, view }: { summary: Summary; view: ValueView }) {
  if (summary.groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tip: put categories in overarching groups such as “Fun &amp; games” in{" "}
        <Link
          to="/settings/budget"
          className="font-medium text-foreground underline underline-offset-4"
        >
          budget settings
        </Link>{" "}
        to see totals per group.
      </p>
    )
  }
  return (
    <Breakdown
      title="By group"
      firstColumn="Group"
      rows={summary.groups}
      summary={summary}
      view={view}
      detail={(row) => {
        const group = summary.groups.find((g) => g.name === row.name)
        return group?.categories.join(", ")
      }}
      chart={
        summary.totals.expenses > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Where the money went</CardTitle>
              <CardDescription>
                Expenses by group in {summary.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GroupPieChart
                groups={summary.groups}
                allGroupNames={summary.groupNames}
                totalExpenses={summary.totals.expenses}
                view={view}
                periodLabel={summary.label}
              />
            </CardContent>
          </Card>
        )
      }
    />
  )
}

function Categories({ summary, view }: { summary: Summary; view: ValueView }) {
  return (
    <Breakdown
      title="By category"
      firstColumn="Category"
      rows={summary.categories}
      summary={summary}
      view={view}
      detail={(row) =>
        summary.categories.find((c) => c.name === row.name)?.group ?? undefined
      }
    />
  )
}

/** Income and expenses per name, with the change since the previous period. */
function Breakdown({
  title,
  firstColumn,
  rows,
  summary,
  view,
  detail,
  chart,
}: {
  title: string
  firstColumn: string
  rows: Array<BreakdownRow>
  summary: Summary
  view: ValueView
  /** Small muted text under the name. */
  detail?: (row: BreakdownRow) => string | undefined
  /** Shown between the heading and the table. */
  chart?: React.ReactNode
}) {
  const { totals } = summary
  const show = (value: number, total: number) => {
    if (!value) return "–"
    if (view === "amount") return formatMoney(value)
    const s = share(value, total)
    return s === null ? "–" : formatPercent(s)
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {view === "percent" && (
          <p className="text-sm text-muted-foreground">
            Share of all income and of all expenses in {summary.label}.
          </p>
        )}
      </div>
      {chart}
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{firstColumn}</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">
                vs {summary.previousLabel}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isExpense = row.expenses >= row.income
              const sub = detail?.(row)
              return (
                <TableRow key={row.name}>
                  <TableCell className="max-w-72">
                    <div className="truncate font-medium">{row.name}</div>
                    {sub && (
                      <div className="truncate text-xs text-muted-foreground">
                        {sub}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {show(row.income, totals.income)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {show(row.expenses, totals.expenses)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Trend
                      current={isExpense ? row.expenses : row.income}
                      previous={
                        isExpense ? row.previousExpenses : row.previousIncome
                      }
                      goodWhen={isExpense ? "down" : "up"}
                      view={view}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function StatCard({
  title,
  value,
  trend,
  hint,
  link,
}: {
  title: string
  value: string
  trend: React.ReactNode
  hint?: string
  link?: { to: "/budget/income" | "/budget/expenses"; period: string }
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {link && (
          <CardAction>
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link to={link.to} search={{ period: link.period }} />}
            >
              Details
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {trend}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  )
}
