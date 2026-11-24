import * as React from "react"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import {
  LibraryIcon,
  ListChecksIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import type { ChoreDraft } from "@/components/chores/chore-editor"
import { PageHeader } from "@/components/budget/page-header"
import { ChoreEditor } from "@/components/chores/chore-editor"
import { Doubloons } from "@/components/chores/doubloons"
import {
  deleteTemplate,
  listTemplates,
  saveTemplate,
} from "@/server/chore-library"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export const Route = createFileRoute("/_dashboard/settings/chores")({
  staticData: { title: "Tjanse-arkivet" },
  loader: () => listTemplates(),
  component: ChoreLibrary,
})

type Template = Awaited<ReturnType<typeof listTemplates>>[number]

function toData(draft: ChoreDraft) {
  return { ...draft, items: draft.items.map((item) => item.label) }
}

function ChoreLibrary() {
  const templates = Route.useLoaderData()
  const router = useRouter()
  const [creating, setCreating] = React.useState(false)

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Tjanse-arkivet"
        description="Tjanser du kan trække ind i ethvert togt. De bliver liggende her, når de er klaret, klar til næste togt."
      >
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/chores/plan" search={{ week: "next" }} />}
        >
          Planlæg næste togt
        </Button>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          Ny tjans
        </Button>
      </PageHeader>

      <ChoreEditor
        open={creating}
        onOpenChange={setCreating}
        heading="Ny tjans"
        initial={{ title: "", doubloons: 10, items: [] }}
        submitLabel="Læg i arkivet"
        onSave={async (draft) => {
          await saveTemplate({ data: toData(draft) })
          await router.invalidate()
        }}
      />

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <LibraryIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Arkivet er tomt</p>
            <p className="text-sm text-muted-foreground">
              Tilføj tjanser som “Skrub badeværelset” eller “Vask gulvene”.
            </p>
          </div>
        </div>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {templates.map((template) => (
                <TemplateRow key={template.id} template={template} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TemplateRow({ template }: { template: Template }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const remove = async () => {
    try {
      await deleteTemplate({ data: { id: template.id } })
      await router.invalidate()
    } catch (err) {
      console.error("[chores] could not delete template", err)
      setError("Arrh, den kunne ikke slettes. Prøv igen.")
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{template.title}</span>
        <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <Doubloons amount={template.doubloons} />
          <span className="inline-flex items-center gap-1">
            <ListChecksIcon aria-hidden className="size-3.5" />
            {template.items.length === 0
              ? "Ingen tjekliste"
              : `${template.items.length} ${template.items.length === 1 ? "punkt" : "punkter"}`}
          </span>
        </span>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Redigér ${template.title}`}
        onClick={() => setEditing(true)}
      >
        <PencilIcon />
      </Button>
      {confirming ? (
        <Button
          variant="destructive"
          size="sm"
          autoFocus
          onBlur={() => setConfirming(false)}
          onClick={() => void remove()}
        >
          Slet
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Slet ${template.title}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon />
        </Button>
      )}
      <ChoreEditor
        open={editing}
        onOpenChange={setEditing}
        heading="Redigér tjans"
        description="Togter der allerede er planlagt, beholder deres egen kopi."
        initial={{
          title: template.title,
          doubloons: template.doubloons,
          items: template.items.map((label) => ({ label })),
        }}
        submitLabel="Gem"
        onSave={async (draft) => {
          await saveTemplate({ data: { id: template.id, ...toData(draft) } })
          await router.invalidate()
        }}
      />
    </li>
  )
}
