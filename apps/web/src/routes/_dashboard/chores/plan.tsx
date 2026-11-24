import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  GripVerticalIcon,
  LibraryIcon,
  ListChecksIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { z } from "zod"

import type { ChoreDraft } from "@/components/chores/chore-editor"
import type { WeekChore } from "@/server/weeks"
import { PageHeader } from "@/components/budget/page-header"
import { ChoreEditor } from "@/components/chores/chore-editor"
import { Doubloons } from "@/components/chores/doubloons"
import { MemberAvatar } from "@/components/chores/member-avatar"
import { addDays, formatWeek, today, weekNumber, weekStart } from "@/lib/chores"
import { listTemplates, saveTemplate } from "@/server/chore-library"
import {
  addToWeek,
  copyPreviousWeek,
  getWeek,
  moveWeekChore,
  removeWeekChore,
  updateWeekChore,
} from "@/server/weeks"
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
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/_dashboard/chores/plan")({
  staticData: { title: "Planlæg togtet" },
  validateSearch: z.object({
    week: z.enum(["this", "next"]).default("next"),
  }),
  loaderDeps: ({ search }) => ({ week: search.week }),
  loader: async ({ deps }) => {
    const monday = weekStart(today())
    const week = deps.week === "next" ? addDays(monday, 7) : monday
    const [plan, templates] = await Promise.all([
      getWeek({ data: { week } }),
      listTemplates(),
    ])
    return { plan, templates }
  },
  component: PlanWeek,
})

type Template = Awaited<ReturnType<typeof listTemplates>>[number]

/** What's being dragged: a library chore or one already in the week. */
type Dragged = { kind: "template" | "chore"; id: string }
const DRAG_TYPE = "application/x-saifnd-chore"

function PlanWeek() {
  const { plan, templates } = Route.useLoaderData()
  const { week: which } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [note, setNote] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await action()
      await router.invalidate()
    } catch (err) {
      console.error("[chores] could not change the week", err)
      setError("Arrh, ændringen kunne ikke gemmes. Prøv igen.")
    } finally {
      setBusy(false)
    }
  }

  const add = (templateId: string, position?: number) =>
    run(() => addToWeek({ data: { week: plan.week, templateId, position } }))

  const drop = (dragged: Dragged, position: number) => {
    if (dragged.kind === "template") return add(dragged.id, position)
    const from = plan.chores.findIndex((c) => c.id === dragged.id)
    // Dropping below itself: everything after it moves up one.
    const to = from !== -1 && from < position ? position - 1 : position
    if (to === from) return
    return run(() => moveWeekChore({ data: { id: dragged.id, position: to } }))
  }

  const copy = () =>
    run(async () => {
      const { copied } = await copyPreviousWeek({ data: { week: plan.week } })
      setNote(
        copied === 0
          ? "Sidste togt havde ingen tjanser at kopiere."
          : `Kopierede ${copied} ${copied === 1 ? "tjans" : "tjanser"} fra sidste togt.`
      )
    })

  const offered = plan.chores.reduce((sum, c) => sum + c.doubloons, 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Planlæg togtet"
        description="Træk tjanser fra arkivet ind i ugen. Enhver i besætningen kan klare dem."
      >
        <ToggleGroup
          variant="outline"
          value={[which]}
          onValueChange={(value: Array<string>) => {
            const next = value[0]
            if (next === "this" || next === "next") {
              void navigate({ search: { week: next } })
            }
          }}
        >
          <ToggleGroupItem value="this">Denne uge</ToggleGroupItem>
          <ToggleGroupItem value="next">Næste uge</ToggleGroupItem>
        </ToggleGroup>
      </PageHeader>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LibraryIcon className="size-4 text-muted-foreground" />
              Tjanse-arkivet
            </CardTitle>
            <CardDescription>Altid klar, togt efter togt.</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link to="/settings/chores" />}
              >
                Administrér
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Arkivet er tomt. Skriv den første tjans.
              </p>
            )}
            <ul className="flex flex-col gap-1.5">
              {templates.map((template) => (
                <LibraryRow
                  key={template.id}
                  template={template}
                  disabled={busy}
                  onAdd={() => void add(template.id)}
                />
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setCreating(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Ny tjans
            </Button>
            <ChoreEditor
              open={creating}
              onOpenChange={setCreating}
              heading="Ny tjans"
              description="Den lægges i arkivet, klar til ethvert togt."
              initial={{ title: "", doubloons: 10, items: [] }}
              submitLabel="Læg i arkivet"
              onSave={async (draft) => {
                await saveTemplate({
                  data: { ...draft, items: draft.items.map((i) => i.label) },
                })
                await router.invalidate()
              }}
            />
          </CardContent>
        </Card>

        <WeekColumn
          title={`${which === "next" ? "Næste uge" : "Denne uge"} · uge ${weekNumber(plan.week)}`}
          subtitle={formatWeek(plan.week)}
          chores={plan.chores}
          offered={offered}
          busy={busy}
          onDrop={(dragged, position) => void drop(dragged, position)}
          onMove={(id, position) =>
            void run(() => moveWeekChore({ data: { id, position } }))
          }
          onRemove={(id) => void run(() => removeWeekChore({ data: { id } }))}
          onCopy={() => void copy()}
          error={error}
          note={note}
        />
      </div>
    </div>
  )
}

function LibraryRow({
  template,
  disabled,
  onAdd,
}: {
  template: Template
  disabled: boolean
  onAdd: () => void
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy"
        e.dataTransfer.setData(
          DRAG_TYPE,
          JSON.stringify({
            kind: "template",
            id: template.id,
          } satisfies Dragged)
        )
      }}
      className="group flex cursor-grab items-center gap-2 rounded-lg border bg-card p-2 pl-1 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing"
    >
      <GripVerticalIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{template.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Doubloons amount={template.doubloons} short />
          {template.items.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecksIcon aria-hidden className="size-3" />
              {template.items.length}
            </span>
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={`Tilføj ${template.title} til ugen`}
        onClick={onAdd}
      >
        <PlusIcon />
      </Button>
    </li>
  )
}

function readDrag(e: React.DragEvent): Dragged | null {
  try {
    const value: unknown = JSON.parse(e.dataTransfer.getData(DRAG_TYPE))
    const parsed = z
      .object({ kind: z.enum(["template", "chore"]), id: z.string() })
      .safeParse(value)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function WeekColumn({
  title,
  subtitle,
  chores,
  offered,
  busy,
  onDrop,
  onMove,
  onRemove,
  onCopy,
  error,
  note,
}: {
  title: string
  subtitle: string
  chores: Array<WeekChore>
  offered: number
  busy: boolean
  onDrop: (dragged: Dragged, position: number) => void
  onMove: (id: string, position: number) => void
  onRemove: (id: string) => void
  onCopy: () => void
  error: string | null
  note: string | null
}) {
  // Where a drop would land: before the chore at this index.
  const [dropAt, setDropAt] = React.useState<number | null>(null)
  const list = React.useRef<HTMLOListElement>(null)

  const indexFor = (clientY: number) => {
    const rows = Array.from(list.current?.children ?? [])
    const i = rows.findIndex((row) => {
      const box = row.getBoundingClientRect()
      return clientY < box.top + box.height / 2
    })
    return i === -1 ? rows.length : i
  }

  return (
    <Card
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
        e.preventDefault()
        setDropAt(indexFor(e.clientY))
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDropAt(null)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        const dragged = readDrag(e)
        const position = indexFor(e.clientY)
        setDropAt(null)
        if (dragged) onDrop(dragged, position)
      }}
      className={cn(
        "transition-colors",
        dropAt !== null && "ring-2 ring-primary/50"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {busy && (
            <Loader2Icon
              aria-label="Gemmer"
              className="size-4 animate-spin text-muted-foreground"
            />
          )}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2">
          {subtitle}
          <span aria-hidden>·</span>
          {chores.length} {chores.length === 1 ? "tjans" : "tjanser"}
          <span aria-hidden>·</span>
          <Doubloons amount={offered} /> til fri plyndring
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" disabled={busy} onClick={onCopy}>
            <CopyIcon data-icon="inline-start" />
            Kopiér sidste togt
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {chores.length === 0 ? (
          <div
            className={cn(
              "flex min-h-40 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground",
              dropAt !== null && "border-primary bg-primary/5 text-foreground"
            )}
          >
            <p className="font-medium">Smid tjanser her</p>
            <p>…eller tryk + ved en tjans i arkivet.</p>
          </div>
        ) : (
          <ol ref={list} className="flex flex-col gap-1.5">
            {chores.map((chore, index) => (
              <WeekRow
                key={chore.id}
                chore={chore}
                index={index}
                count={chores.length}
                busy={busy}
                dropBefore={dropAt === index}
                dropAfter={
                  dropAt === chores.length && index === chores.length - 1
                }
                onMove={onMove}
                onRemove={onRemove}
              />
            ))}
          </ol>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="text-sm text-muted-foreground">
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function WeekRow({
  chore,
  index,
  count,
  busy,
  dropBefore,
  dropAfter,
  onMove,
  onRemove,
}: {
  chore: WeekChore
  index: number
  count: number
  busy: boolean
  dropBefore: boolean
  dropAfter: boolean
  onMove: (id: string, position: number) => void
  onRemove: (id: string) => void
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const done = chore.doneBy

  const save = async (draft: ChoreDraft) => {
    await updateWeekChore({ data: { id: chore.id, ...draft } })
    await router.invalidate()
  }

  return (
    <>
      <li
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move"
          e.dataTransfer.setData(
            DRAG_TYPE,
            JSON.stringify({ kind: "chore", id: chore.id } satisfies Dragged)
          )
        }}
        className={cn(
          "relative flex cursor-grab items-center gap-2 rounded-lg border bg-card p-2 pl-1 active:cursor-grabbing",
          dropBefore &&
            "before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:rounded-full before:bg-primary",
          dropAfter &&
            "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
        )}
        style={done ? { boxShadow: `inset 3px 0 0 ${done.color}` } : undefined}
      >
        <GripVerticalIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate text-sm font-medium",
              done && "text-muted-foreground line-through"
            )}
          >
            {chore.title}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Doubloons amount={chore.doubloons} short />
            {chore.items.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ListChecksIcon aria-hidden className="size-3" />
                {chore.items.length}
              </span>
            )}
            {done && <span>Klaret af {done.name}</span>}
          </span>
        </div>
        {done && <MemberAvatar member={done} size="sm" />}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy || index === 0}
            aria-label={`Flyt ${chore.title} op`}
            onClick={() => onMove(chore.id, index - 1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy || index === count - 1}
            aria-label={`Flyt ${chore.title} ned`}
            onClick={() => onMove(chore.id, index + 1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Redigér ${chore.title}`}
            onClick={() => setEditing(true)}
          >
            <PencilIcon />
          </Button>
          {confirming ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              autoFocus
              onBlur={() => setConfirming(false)}
              onClick={() => onRemove(chore.id)}
            >
              {done ? `Fjern og tag ${chore.doubloons} tilbage` : "Fjern"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Fjern ${chore.title} fra ugen`}
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
      </li>
      <ChoreEditor
        open={editing}
        onOpenChange={setEditing}
        heading="Redigér tjans"
        description={
          done
            ? `Allerede klaret af ${done.name}. En ny belønning betales til dem i stedet.`
            : "Ændrer den kun på dette togt, ikke i arkivet."
        }
        initial={{
          title: chore.title,
          doubloons: chore.doubloons,
          items: chore.items.map((i) => ({ id: i.id, label: i.label })),
        }}
        submitLabel="Gem"
        onSave={save}
      />
    </>
  )
}
