import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { TransactionsPage } from "@/components/budget/transactions-page"
import { periodSearchParam } from "@/lib/period"
import { listTransactions } from "@/server/budget"

export const Route = createFileRoute("/_dashboard/budget/income")({
  staticData: { title: "Income" },
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
        direction: "in",
      },
    }),
  component: function IncomePage() {
    const data = Route.useLoaderData()
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <TransactionsPage
        title="Income"
        data={data}
        search={search}
        onSearchChange={(next) => navigate({ search: next })}
      />
    )
  },
})
