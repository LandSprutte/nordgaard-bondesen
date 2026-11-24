import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"

import { updateTransactionDescription } from "@/server/budget"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

const MAX_LENGTH = 500

/**
 * The family's own note on a transaction. Shown under the bank's text;
 * click to write or change it. Enter or leaving the field saves, Escape
 * cancels, and an empty field removes it.
 */
export function DescriptionEditor({
  id,
  description,
  label,
}: {
  id: string
  description: string | null
  /** What the transaction is called, for screen readers. */
  label: string
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(description ?? "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Shown while saving and until fresh data arrives.
  const [optimistic, setOptimistic] = React.useState<string | null>()
  const button = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => setOptimistic(undefined), [description])

  const shown = optimistic === undefined ? description : optimistic

  const start = () => {
    setDraft(shown ?? "")
    setError(null)
    setEditing(true)
  }

  const finish = async (save: boolean) => {
    setEditing(false)
    // Put focus back where it was, so keyboard users don't lose their place.
    requestAnimationFrame(() => button.current?.focus())
    const next = draft.trim()
    if (!save || next === (shown ?? "")) return
    setOptimistic(next || null)
    setSaving(true)
    try {
      await updateTransactionDescription({ data: { id, description: next } })
      await router.invalidate()
    } catch (err) {
      console.error("[budget] could not save description", err)
      setOptimistic(undefined)
      setError("Couldn't save the description. Try again.")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        maxLength={MAX_LENGTH}
        placeholder="Add a description…"
        aria-label={`Description for ${label}`}
        className="mt-1 h-7 text-xs"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void finish(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            void finish(true)
          } else if (e.key === "Escape") {
            e.preventDefault()
            void finish(false)
          }
        }}
      />
    )
  }

  return (
    <div className="mt-0.5 flex flex-col">
      <button
        ref={button}
        type="button"
        onClick={start}
        aria-label={
          shown
            ? `Edit description for ${label}: ${shown}`
            : `Add a description for ${label}`
        }
        className={cn(
          "group/description inline-flex max-w-full items-center gap-1 self-start rounded-sm text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
          shown
            ? "text-foreground/80 italic"
            : "text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
        )}
      >
        <span className="truncate">{shown ?? "Add description"}</span>
        {saving ? (
          <Loader2Icon aria-hidden className="size-3 shrink-0 animate-spin" />
        ) : shown ? (
          <PencilIcon
            aria-hidden
            className="size-3 shrink-0 opacity-0 group-hover/description:opacity-100"
          />
        ) : (
          <PlusIcon aria-hidden className="-order-1 size-3 shrink-0" />
        )}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
