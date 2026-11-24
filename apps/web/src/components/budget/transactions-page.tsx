import { Link } from "@tanstack/react-router"

import { DescriptionEditor } from "@/components/budget/description-editor"
import { NoDataYet } from "@/components/budget/empty-state"
import { PeriodPicker } from "@/components/budget/period-picker"
import { PageHeader } from "@/components/budget/page-header"
import { accountDisplayName, formatDay, formatMoney } from "@/lib/format"
import type { listTransactions } from "@/server/budget"
import { Badge } from "@workspace/ui/components/badge"
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export type TransactionsSearch = {
  period?: string
  account?: string
  transfers?: boolean
}

type Data = Awaited<ReturnType<typeof listTransactions>>

export function TransactionsPage({
  title,
  data,
  search,
  onSearchChange,
}: {
  title: string
  data: Data
  search: TransactionsSearch
  onSearchChange: (search: TransactionsSearch) => void
}) {
  const total = data.transactions.reduce((sum, t) => sum + t.amount, 0)
  const update = (patch: TransactionsSearch) =>
    onSearchChange({ ...search, period: data.period, ...patch })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader title={title} description={data.label}>
        <NativeSelect
          aria-label="Account"
          value={search.account ?? ""}
          onChange={(event) =>
            update({ account: event.target.value || undefined })
          }
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

      <div className="flex items-center gap-2">
        <Checkbox
          id="include-transfers"
          checked={search.transfers ?? false}
          onCheckedChange={(checked) =>
            update({ transfers: checked || undefined })
          }
        />
        <Label htmlFor="include-transfers">
          Include transfers between our own accounts
        </Label>
      </div>

      {!data.hasAnyData ? (
        <NoDataYet />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nothing here for {data.label}.
                  </TableCell>
                </TableRow>
              )}
              {data.transactions.map((t) => (
                <TableRow key={t.id} className="group/row">
                  <TableCell className="text-muted-foreground">
                    {formatDay(t.date)}
                  </TableCell>
                  <TableCell className="max-w-72">
                    <div className="truncate font-medium">
                      {t.label ?? t.text}
                    </div>
                    {t.label && (
                      <div className="truncate text-xs text-muted-foreground">
                        {t.text}
                      </div>
                    )}
                    <DescriptionEditor
                      id={t.id}
                      description={t.description}
                      label={t.label ?? t.text}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {t.isTransfer ? (
                      <Badge variant="outline">Transfer</Badge>
                    ) : t.category ? (
                      <Badge variant="secondary">{t.category}</Badge>
                    ) : (
                      <Link
                        to="/settings/budget"
                        search={{ q: t.key }}
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Set category
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {accountDisplayName({
                      number: t.accountNumber,
                      name: t.accountName,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {data.transactions.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="hidden md:table-cell" />
                  <TableCell className="hidden lg:table-cell" />
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  )
}
