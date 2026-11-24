import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  FlameIcon,
} from "lucide-react"
import { z } from "zod"

import type { SpendingNode, Verdict } from "@/lib/spending"
import { NoDataYet } from "@/components/budget/empty-state"
import { PageHeader } from "@/components/budget/page-header"
import { PeriodPicker } from "@/components/budget/period-picker"
import { Trend } from "@/components/budget/trend"
import {
  accountDisplayName,
  formatDay,
  formatMoney,
  formatPercent,
} from "@/lib/format"
import { periodSearchParam, relativeChange } from "@/lib/period"
import { ID_SEPARATOR, flatten, verdict } from "@/lib/spending"
import { getSpending } from "@/server/budget"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/_dashboard/budget/spending")({
  staticData: { title: "Spending" },
  validateSearch: z.object({
    period: periodSearchParam,
    account: z.string().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getSpending({ data: deps }),
  component: SpendingPage,
})

type Data = Awaited<ReturnType<typeof getSpending>>

/** The ids of a node and every node above it, top first. */
function pathTo(id: string): Array<string> {
  const parts = id.split(ID_SEPARATOR)
  return parts.map((_, i) => parts.slice(0, i + 1).join(ID_SEPARATOR))
}

/** Keeps only what's over usual, plus the branches leading to it. */
function onlyOver(nodes: Array<SpendingNode>): Array<SpendingNode> {
  return nodes.flatMap((node) => {
    const children = onlyOver(node.children)
    const over = ["over", "new"].includes(verdict(node.amount, node.usual))
    return over || children.length > 0 ? [{ ...node, children }] : []
  })
}

function SpendingPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [overOnly, setOverOnly] = React.useState(false)
  // Top-level rows start open, so the categories show straight away.
  const [open, setOpen] = React.useState<Set<string>>(
    () => new Set(data.grouped ? data.nodes.map((n) => n.id) : [])
  )
  const [highlight, setHighlight] = React.useState<string | null>(null)

  const nodes = overOnly ? onlyOver(data.nodes) : data.nodes
  const all = flatten(nodes)
  const expandable = all.filter(
    (n) => n.children.length > 0 || n.transactions.length > 0
  )
  const allOpen =
    expandable.length > 0 && expandable.every((n) => open.has(n.id))

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** Opens the way to a node and scrolls it into view. */
  const reveal = (id: string) => {
    setOpen((prev) => new Set([...prev, ...pathTo(id).slice(0, -1), id]))
    setHighlight(id)
    requestAnimationFrame(() => {
      document
        .getElementById(`row-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  const update = (patch: { period?: string; account?: string }) =>
    navigate({ search: { ...search, period: data.period, ...patch } })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Spending"
        description={`Where the money went in ${data.label}`}
      >
        <NativeSelect
          aria-label="Account"
          value={search.account ?? ""}
          onChange={(e) => update({ account: e.target.value || undefined })}
        >
          <NativeSelectOption value="">All accounts</NativeSelectOption>
          {data.accounts.map((account) => (
            <NativeSelectOption key={account.number} value={account.number}>
              {accountDisplayName(account)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <PeriodPicker
          period={data.period}
          periods={data.periods}
          onChange={(period) => update({ period })}
        />
      </PageHeader>

      {!data.hasAnyData ? (
        <NoDataYet />
      ) : (
        <>
          <Overview data={data} onReveal={reveal} />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="over-only"
                checked={overOnly}
                onCheckedChange={(checked) => {
                  setOverOnly(checked)
                  // Show straight away where the overspending is.
                  if (checked) {
                    setOpen(
                      new Set(flatten(onlyOver(data.nodes)).map((n) => n.id))
                    )
                  }
                }}
              />
              <Label htmlFor="over-only">Only show what's over usual</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={expandable.length === 0}
              onClick={() =>
                setOpen(
                  allOpen ? new Set() : new Set(expandable.map((n) => n.id))
                )
              }
            >
              {allOpen ? (
                <ChevronsDownUpIcon data-icon="inline-start" />
              ) : (
                <ChevronsUpDownIcon data-icon="inline-start" />
              )}
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {data.grouped
                      ? "Group / category / shop"
                      : "Category / shop"}
                  </TableHead>
                  <TableHead className="hidden w-40 md:table-cell">
                    Share
                  </TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    vs {data.previousLabel}
                  </TableHead>
                  <TableHead className="hidden w-56 sm:table-cell">
                    vs usual
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {overOnly
                        ? `Nothing is over usual in ${data.label}. Nice!`
                        : `No spending in ${data.label}.`}
                    </TableCell>
                  </TableRow>
                )}
                {nodes.map((node) => (
                  <NodeRows
                    key={node.id}
                    node={node}
                    depth={0}
                    total={data.total.amount}
                    open={open}
                    highlight={highlight}
                    onToggle={toggle}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

/** Totals, and the categories running furthest over usual. */
function Overview({
  data,
  onReveal,
}: {
  data: Data
  onReveal: (id: string) => void
}) {
  const { total } = data
  const categories = flatten(data.nodes).filter((n) => n.level === "category")
  const hot = categories
    .filter((n) => ["over", "new"].includes(verdict(n.amount, n.usual)))
    .sort((a, b) => b.amount - (b.usual ?? 0) - (a.amount - (a.usual ?? 0)))
    .slice(0, 5)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <Card>
        <CardHeader>
          <CardDescription>Spent in {data.label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatMoney(total.amount)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Trend
            current={total.amount}
            previous={total.previous}
            goodWhen="down"
            view="amount"
            previousLabel={data.previousLabel}
          />
          {total.usual !== null && data.usualLabel && (
            <Trend
              current={total.amount}
              previous={total.usual}
              goodWhen="down"
              view="amount"
              previousLabel={`the average of ${data.usualLabel}`}
            />
          )}
          <span className="text-xs text-muted-foreground">
            {total.count} purchases
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlameIcon className="size-4 text-[#d03b3b]" aria-hidden />
            Running hot
          </CardTitle>
          <CardDescription>
            {data.usualLabel
              ? `Categories at least 20% above their average for ${data.usualLabel}.`
              : "Needs an earlier period with data to compare with."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.usualLabel && hot.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing stands out. Spending is about as usual. 👍
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {hot.map((node) => {
              const extra = node.amount - (node.usual ?? 0)
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => onReveal(node.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,10rem)_1fr_auto]"
                  >
                    <span className="truncate font-medium">{node.name}</span>
                    <UsualBar
                      amount={node.amount}
                      usual={node.usual}
                      className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-1"
                    />
                    <span className="text-right text-sm whitespace-nowrap tabular-nums">
                      <span className="font-semibold text-[#d03b3b]">
                        +{formatMoney(extra)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        ({formatMoney(node.amount)})
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

const INDENT = ["pl-2", "pl-7", "pl-12", "pl-[4.25rem]"]

function NodeRows({
  node,
  depth,
  total,
  open,
  highlight,
  onToggle,
}: {
  node: SpendingNode
  depth: number
  total: number
  open: Set<string>
  highlight: string | null
  onToggle: (id: string) => void
}) {
  const isOpen = open.has(node.id)
  const canOpen = node.children.length > 0 || node.transactions.length > 0
  const share = total > 0 ? node.amount / total : 0

  return (
    <>
      <TableRow
        id={`row-${node.id}`}
        className={cn(
          depth === 0 && "bg-muted/40 font-semibold",
          highlight === node.id && "bg-amber-100/70 dark:bg-amber-500/15"
        )}
      >
        <TableCell className={cn("max-w-80", INDENT[depth])}>
          {canOpen ? (
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => onToggle(node.id)}
              className="flex max-w-full items-center gap-1.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRightIcon
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-90"
                )}
              />
              <span className="truncate">{node.name}</span>
              {node.level === "shop" && (
                <span className="shrink-0 text-xs font-normal text-muted-foreground">
                  · {node.count}×
                </span>
              )}
            </button>
          ) : (
            <span className="pl-5.5">{node.name}</span>
          )}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${share * 100}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
              {formatPercent(share)}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right whitespace-nowrap tabular-nums">
          {formatMoney(node.amount)}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Trend
            current={node.amount}
            previous={node.previous}
            goodWhen="down"
            view="amount"
          />
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <UsualCell amount={node.amount} usual={node.usual} />
        </TableCell>
      </TableRow>

      {isOpen &&
        node.children.map((child) => (
          <NodeRows
            key={child.id}
            node={child}
            depth={depth + 1}
            total={total}
            open={open}
            highlight={highlight}
            onToggle={onToggle}
          />
        ))}

      {isOpen &&
        node.transactions.map((t) => (
          <TableRow key={t.id} className="text-sm text-muted-foreground">
            <TableCell className={cn("max-w-80", INDENT[depth + 1])}>
              <div className="flex gap-3 pl-5.5">
                <span className="w-12 shrink-0 tabular-nums">
                  {formatDay(t.date)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{t.text}</span>
                  {t.description && (
                    <span className="block truncate text-xs text-foreground/80 italic">
                      {t.description}
                    </span>
                  )}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell" />
            <TableCell className="text-right whitespace-nowrap tabular-nums">
              {formatMoney(t.amount)}
            </TableCell>
            <TableCell className="hidden lg:table-cell" />
            <TableCell className="hidden sm:table-cell" />
          </TableRow>
        ))}
    </>
  )
}

const VERDICT: Record<Verdict, { text: string; className: string }> = {
  over: { text: "over usual", className: "text-[#d03b3b] font-semibold" },
  new: { text: "New", className: "text-[#d03b3b] font-semibold" },
  under: { text: "under usual", className: "text-[#0ca30c]" },
  usual: { text: "As usual", className: "text-muted-foreground" },
  unknown: { text: "–", className: "text-muted-foreground" },
}

/** The bar plus "+45 % over usual". */
function UsualCell({
  amount,
  usual,
}: {
  amount: number
  usual: number | null
}) {
  const v = verdict(amount, usual)
  const change = relativeChange(amount, usual)
  const { text, className } = VERDICT[v]
  return (
    <div className="flex flex-col gap-1">
      <UsualBar amount={amount} usual={usual} />
      <span className={cn("text-xs", className)}>
        {(v === "over" || v === "under") && change !== null
          ? `${formatPercent(change, { sign: true })} ${text}`
          : text}
        {usual !== null && (
          <span className="font-normal text-muted-foreground">
            {" "}
            · avg {formatMoney(usual)}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * Spent this period as a bar, with a line where the usual amount is. Red
 * past the line when it's clearly over, green when clearly under.
 */
function UsualBar({
  amount,
  usual,
  className,
}: {
  amount: number
  usual: number | null
  className?: string
}) {
  if (usual === null) return null
  const max = Math.max(amount, usual) || 1
  const v = verdict(amount, usual)
  return (
    <div
      aria-hidden
      className={cn("relative h-2 w-full rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          v === "over" || v === "new"
            ? "bg-[#d03b3b]"
            : v === "under"
              ? "bg-[#0ca30c]"
              : "bg-foreground/40"
        )}
        style={{ width: `${(amount / max) * 100}%` }}
      />
      {usual > 0 && (
        <div
          className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
          style={{ left: `calc(${(usual / max) * 100}% - 1px)` }}
        />
      )}
    </div>
  )
}
