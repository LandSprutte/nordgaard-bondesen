import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { SearchIcon } from "lucide-react"
import { z } from "zod"

import { SaveIndicator, useAutoSave } from "@/components/auto-save"
import { AccountNumber } from "@/components/budget/account-number"
import { PageHeader } from "@/components/budget/page-header"
import { formatMoney } from "@/lib/format"
import {
  getBudgetSettings,
  updateAccount,
  updateCategoryGroup,
  updateTextKey,
} from "@/server/budget"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
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

const filters = ["todo", "all", "transfers"] as const

export const Route = createFileRoute("/_dashboard/settings/budget")({
  staticData: { title: "Budget" },
  validateSearch: z.object({
    q: z.string().optional(),
    show: z.enum(filters).optional(),
  }),
  loader: () => getBudgetSettings(),
  component: BudgetSettings,
})

type Settings = Awaited<ReturnType<typeof getBudgetSettings>>
type KeyRow = Settings["keys"][number]

function BudgetSettings() {
  const settings = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const q = search.q ?? ""
  // Searching for a specific key (e.g. from "Set category") shows every key.
  const show = search.show ?? (search.q ? "all" : "todo")

  const keys = settings.keys.filter((k) => {
    if (show === "todo" && (k.isTransfer || (k.label && k.category)))
      return false
    if (show === "transfers" && !k.isTransfer) return false
    if (!q) return true
    const needle = q.toLowerCase()
    return [k.key, k.label, k.category, k.example].some((v) =>
      v?.toLowerCase().includes(needle)
    )
  })
  const todoCount = settings.keys.filter(
    (k) => !k.isTransfer && !(k.label && k.category)
  ).length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Budget settings"
        description="Name your accounts and translate the bank's texts into something that makes sense."
      />

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Accounts found in your bank exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {settings.accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Import a CSV file to see your accounts here.
            </p>
          )}
          {settings.accounts.map((account) => (
            <AccountRow key={account.number} account={account} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category groups</CardTitle>
          <CardDescription>
            Put related categories in an overarching group, e.g. “Gaming” and
            “Fastfood/Restaurent” in “Fun &amp; games”, to see what you spend on
            it in total. Categories come from the bank texts below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Give some bank texts a category first.
            </p>
          ) : (
            <>
              <datalist id="budget-category-groups">
                {settings.groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
              <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                {settings.categories.map((category) => (
                  <CategoryGroupRow key={category.name} category={category} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bank texts</h2>
            <p className="text-sm text-muted-foreground">
              Every distinct “Tekst” from the bank becomes a key. Give it a name
              and category, or mark it as a transfer between your own accounts
              so it isn&apos;t counted as income or expense. Changes save
              automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search bank texts"
                placeholder="Search…"
                className="w-56 pl-8"
                defaultValue={q}
                onChange={(event) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      q: event.target.value || undefined,
                    }),
                    replace: true,
                  })
                }
              />
            </div>
            <NativeSelect
              aria-label="Filter"
              value={show}
              onChange={(event) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    show: event.target.value as (typeof filters)[number],
                  }),
                })
              }
            >
              <NativeSelectOption value="todo">
                Needs attention ({todoCount})
              </NativeSelectOption>
              <NativeSelectOption value="all">
                All ({settings.keys.length})
              </NativeSelectOption>
              <NativeSelectOption value="transfers">
                Transfers
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <datalist id="budget-categories">
          {settings.categories.map((category) => (
            <option key={category.name} value={category.name} />
          ))}
        </datalist>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank text</TableHead>
                <TableHead className="min-w-48">Name</TableHead>
                <TableHead className="min-w-40">Category</TableHead>
                <TableHead>Transfer</TableHead>
                <TableHead className="w-8">
                  <span className="sr-only">Status</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {show === "todo" && !q
                      ? "All bank texts have a name and category."
                      : "No bank texts match."}
                  </TableCell>
                </TableRow>
              )}
              {keys.map((row) => (
                <KeyRowEditor key={row.key} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function AccountRow({ account }: { account: Settings["accounts"][number] }) {
  const { state, save } = useAutoSave()
  const [name, setName] = React.useState(account.name ?? "")
  const id = `account-${account.number}`

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <AccountNumber
          number={account.number}
          className="text-xs text-muted-foreground"
        />
        <div className="flex items-center gap-2">
          {account.balance !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatMoney(account.balance)}
            </span>
          )}
          <SaveIndicator state={state} />
        </div>
      </div>
      <Label htmlFor={id} className="sr-only">
        Name for account ending in {account.number.slice(-4)}
      </Label>
      <Input
        id={id}
        placeholder="e.g. Budgetkonto"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (name.trim() === (account.name ?? "")) return
          void save(() =>
            updateAccount({ data: { number: account.number, name } })
          )
        }}
      />
    </div>
  )
}

function KeyRowEditor({ row }: { row: KeyRow }) {
  const { state, save } = useAutoSave()
  const [label, setLabel] = React.useState(row.label ?? "")
  const [category, setCategory] = React.useState(row.category ?? "")
  const [isTransfer, setIsTransfer] = React.useState(row.isTransfer)

  const persist = (next: {
    label: string
    category: string
    isTransfer: boolean
  }) => {
    const unchanged =
      next.label.trim() === (row.label ?? "") &&
      next.category.trim() === (row.category ?? "") &&
      next.isTransfer === row.isTransfer
    if (unchanged) return
    void save(() => updateTextKey({ data: { key: row.key, ...next } }))
  }
  const current = { label, category, isTransfer }

  return (
    <TableRow>
      <TableCell className="max-w-72 align-top">
        <div className="truncate font-mono text-xs font-medium">{row.key}</div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="tabular-nums">
            {row.count}×
          </Badge>
          <span className="tabular-nums">{formatMoney(row.total)}</span>
          {row.example && row.example.toUpperCase() !== row.key && (
            <span className="truncate">“{row.example}”</span>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Input
          aria-label={`Name for ${row.key}`}
          placeholder={row.example ?? row.key}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={() => persist(current)}
        />
      </TableCell>
      <TableCell className="align-top">
        <Input
          aria-label={`Category for ${row.key}`}
          placeholder={isTransfer ? "—" : "e.g. Groceries"}
          list="budget-categories"
          value={category}
          disabled={isTransfer}
          onChange={(event) => setCategory(event.target.value)}
          onBlur={() => persist(current)}
        />
      </TableCell>
      <TableCell className="align-top">
        <div className="flex h-8 items-center">
          <Checkbox
            aria-label={`${row.key} is a transfer between our own accounts`}
            checked={isTransfer}
            onCheckedChange={(checked) => {
              setIsTransfer(checked)
              persist({ ...current, isTransfer: checked })
            }}
          />
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex h-8 items-center">
          <SaveIndicator state={state} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function CategoryGroupRow({
  category,
}: {
  category: Settings["categories"][number]
}) {
  const { state, save } = useAutoSave()
  const [group, setGroup] = React.useState(category.group ?? "")
  const id = `category-group-${category.name}`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1rem] items-center gap-3">
      <Label htmlFor={id} className="min-w-0 flex-col items-start gap-0">
        <span className="truncate">{category.name}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {category.keyCount} bank {category.keyCount === 1 ? "text" : "texts"}
        </span>
      </Label>
      <Input
        id={id}
        list="budget-category-groups"
        placeholder="No group"
        value={group}
        onChange={(event) => setGroup(event.target.value)}
        onBlur={() => {
          if (group.trim() === (category.group ?? "")) return
          void save(() =>
            updateCategoryGroup({ data: { name: category.name, group } })
          )
        }}
      />
      <SaveIndicator state={state} />
    </div>
  )
}
