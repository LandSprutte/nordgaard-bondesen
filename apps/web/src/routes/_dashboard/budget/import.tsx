import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { CheckCircle2Icon, Loader2Icon, UploadIcon } from "lucide-react"

import { PageHeader } from "@/components/budget/page-header"
import { listImports, uploadBankCsv } from "@/server/budget"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export const Route = createFileRoute("/_dashboard/budget/import")({
  staticData: { title: "Import" },
  loader: () => listImports(),
  component: ImportPage,
})

type Result = Awaited<ReturnType<typeof uploadBankCsv>>

function ImportPage() {
  const imports = Route.useLoaderData()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<Result | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    setPending(true)
    setError(null)
    setResult(null)
    try {
      setResult(await uploadBankCsv({ data: new FormData(form) }))
      form.reset()
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "The import failed.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Import bank export"
        description="Upload the CSV file from your bank. Rows you have already imported are skipped, so overlapping files are fine."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Export all accounts for the month as CSV (semicolon separated).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                aria-describedby={error ? "import-error" : undefined}
                aria-invalid={error ? true : undefined}
              />
            </div>
            {error && (
              <p
                id="import-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <UploadIcon />
              )}
              {pending ? "Importing…" : "Import"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div
          role="status"
          className="flex max-w-xl flex-col gap-2 rounded-xl border bg-muted/40 p-4 text-sm"
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2Icon className="size-4 text-emerald-600" />
            Imported {result.createdCount} new of {result.rowCount} rows from{" "}
            {result.accounts.length} accounts
          </div>
          {result.createdCount < result.rowCount && (
            <p className="text-muted-foreground">
              {result.rowCount - result.createdCount} rows were already imported
              and were skipped.
            </p>
          )}
          {result.newKeys.length > 0 && (
            <p>
              {result.newKeys.length} new bank texts found.{" "}
              <Link
                to="/settings/budget"
                className="font-medium underline underline-offset-4"
              >
                Give them a name and category
              </Link>
            </p>
          )}
          <Link
            to="/budget"
            className="font-medium underline underline-offset-4"
          >
            See the budget
          </Link>
        </div>
      )}

      {imports.length > 0 && (
        <section className="flex max-w-3xl flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent imports</h2>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">New rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="max-w-64 truncate">
                      {i.fileName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(i.importedAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.createdCount} / {i.rowCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  )
}
