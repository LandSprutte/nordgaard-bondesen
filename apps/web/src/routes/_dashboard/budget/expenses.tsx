import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { TransactionsPage } from "@/components/budget/transactions-page"
import { periodSearchParam } from "@/lib/period"
import { listTransactions } from "@/server/budget"

export const Route = createFileRoute("/_dashboard/budget/expenses")({
  staticData: { title: "Expenses" },
  validateSearch: z.object({
    period: periodSearchParam,
    account: z.string().optional(),
    transfers: z.boolean().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listTransactions({
      data: {
        period: deps.period,
        account: deps.account,
        includeTransfers: deps.transfers,
        direction: "out",
      },
    }),
  component: function ExpensesPage() {
    const data = Route.useLoaderData()
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <TransactionsPage
        title="Expenses"
        data={data}
        search={search}
        onSearchChange={(next) => navigate({ search: next })}
      />
    )
  },
})
