import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { GemIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"

import { SaveIndicator, useAutoSave } from "@/components/auto-save"
import { PageHeader } from "@/components/budget/page-header"
import {
  createTreasure,
  deleteTreasure,
  listTreasures,
  updateTreasure,
} from "@/server/treasures"
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

export const Route = createFileRoute("/_dashboard/settings/treasures")({
  staticData: { title: "Skatte" },
  loader: () => listTreasures(),
  component: TreasuresSettings,
})

type Treasure = Awaited<ReturnType<typeof listTreasures>>[number]

const MAX_COST = 100_000

/** Problems with a title and cost as typed, or null when they're fine. */
function validate(title: string, cost: string) {
  const value = Number(cost)
  return {
    title: title.trim() ? null : "Giv skatten et navn.",
    cost:
      cost.trim() !== "" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= MAX_COST
        ? null
        : "Brug et helt tal fra 1 til 100.000.",
  }
}

function TreasuresSettings() {
  const treasures = Route.useLoaderData()

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Skatte"
        description="Bytte besætningen kan plyndre for de dubloner, den tjener på tjanser."
      />

      <AddTreasure />

      <Card>
        <CardHeader>
          <CardTitle>Skattekisten</CardTitle>
          <CardDescription>
            Ændringer gemmes, når du forlader et felt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {treasures.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <GemIcon className="size-8 text-muted-foreground" />
              <p className="font-medium">Kisten er tom</p>
              <p className="text-sm text-muted-foreground">
                Tilføj en skat ovenfor, fx “Vælg fredagsfilmen” for 50 dubloner.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y">
              <li
                aria-hidden
                className="grid grid-cols-[1fr_7rem_4.5rem] gap-2 pb-2 text-xs font-medium text-muted-foreground"
              >
                <span>Navn</span>
                <span>Pris</span>
                <span />
              </li>
              {treasures.map((treasure) => (
                <TreasureRow key={treasure.id} treasure={treasure} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AddTreasure() {
  const router = useRouter()
  const titleRef = React.useRef<HTMLInputElement>(null)
  const [title, setTitle] = React.useState("")
  const [cost, setCost] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const problems = validate(title, cost)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (problems.title || problems.cost || pending) return
    setPending(true)
    setError(null)
    try {
      await createTreasure({ data: { title, cost: Number(cost) } })
      await router.invalidate()
      setTitle("")
      setCost("")
      setSubmitted(false)
      titleRef.current?.focus()
    } catch (err) {
      console.error("[treasures] create failed", err)
      setError("Arrh, skatten kunne ikke tilføjes. Prøv igen.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tilføj en skat</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-wrap items-start gap-3"
        >
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="new-treasure-title">Navn</Label>
            <Input
              ref={titleRef}
              id="new-treasure-title"
              placeholder="fx Vælg fredagsfilmen"
              maxLength={120}
              value={title}
              aria-invalid={submitted && !!problems.title}
              aria-describedby={
                submitted && problems.title
                  ? "new-treasure-title-error"
                  : undefined
              }
              onChange={(event) => setTitle(event.target.value)}
            />
            {submitted && problems.title && (
              <p
                id="new-treasure-title-error"
                className="text-xs text-destructive"
              >
                {problems.title}
              </p>
            )}
          </div>
          <div className="flex w-32 flex-col gap-1.5">
            <Label htmlFor="new-treasure-cost">Pris (dubloner)</Label>
            <Input
              id="new-treasure-cost"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COST}
              step={1}
              placeholder="50"
              value={cost}
              aria-invalid={submitted && !!problems.cost}
              aria-describedby={
                submitted && problems.cost
                  ? "new-treasure-cost-error"
                  : undefined
              }
              onChange={(event) => setCost(event.target.value)}
            />
            {submitted && problems.cost && (
              <p
                id="new-treasure-cost-error"
                className="text-xs text-destructive"
              >
                {problems.cost}
              </p>
            )}
          </div>
          <Button type="submit" disabled={pending} className="mt-6">
            {pending ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            Tilføj
          </Button>
          {error && (
            <p role="alert" className="basis-full text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function TreasureRow({ treasure }: { treasure: Treasure }) {
  const router = useRouter()
  const { state, save } = useAutoSave()
  const [title, setTitle] = React.useState(treasure.title)
  const [cost, setCost] = React.useState(String(treasure.cost))
  const [confirming, setConfirming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState(false)
  const problems = validate(title, cost)
  const problem = problems.title ?? problems.cost

  const persist = () => {
    if (problem) return
    const unchanged =
      title.trim() === treasure.title && Number(cost) === treasure.cost
    if (unchanged) return
    void save(() =>
      updateTreasure({
        data: { id: treasure.id, title, cost: Number(cost) },
      })
    )
  }

  const remove = async () => {
    setDeleting(true)
    setDeleteError(false)
    try {
      await deleteTreasure({ data: { id: treasure.id } })
      await router.invalidate()
    } catch (err) {
      console.error("[treasures] delete failed", err)
      setDeleteError(true)
      setDeleting(false)
    }
  }

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="grid grid-cols-[1fr_7rem_4.5rem] items-center gap-2">
        <Input
          aria-label="Navn"
          maxLength={120}
          value={title}
          aria-invalid={!!problems.title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={persist}
        />
        <Input
          aria-label={`Pris for ${treasure.title} i dubloner`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_COST}
          step={1}
          value={cost}
          aria-invalid={!!problems.cost}
          onChange={(event) => setCost(event.target.value)}
          onBlur={persist}
        />
        <div className="flex items-center justify-end gap-1">
          <SaveIndicator state={state} />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Slet ${treasure.title}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem} Not saved.
        </p>
      )}
      {confirming && (
        <div
          role="group"
          aria-label="Bekræft sletning"
          className="flex flex-wrap items-center justify-end gap-2 text-sm"
        >
          <span className="text-muted-foreground">
            {deleteError
              ? "Arrh, den kunne ikke slettes. Prøv igen?"
              : `Slet “${treasure.title}”?`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={() => setConfirming(false)}
          >
            Fortryd
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleting}
            autoFocus
            onClick={remove}
          >
            Slet
          </Button>
        </div>
      )}
    </li>
  )
}
