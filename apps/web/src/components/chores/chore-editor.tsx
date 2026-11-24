import * as React from "react"
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export type ChoreDraft = {
  title: string
  doubloons: number
  items: Array<{ id?: string; label: string }>
}

const MAX_REWARD = 10_000

let nextKey = 0
const key = () => `new-${nextKey++}`

/**
 * A dialog to write or change a chore: its title, reward and checklist.
 * Enter in a checklist item adds the next one; Backspace in an empty one
 * removes it.
 */
export function ChoreEditor({
  open,
  onOpenChange,
  heading,
  description,
  initial,
  submitLabel,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  heading: string
  description?: string
  initial: ChoreDraft
  submitLabel: string
  /** Throws (with a message) when saving fails. */
  onSave: (draft: ChoreDraft) => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* Remount on open, so the form starts from `initial` every time. */}
        {open && (
          <ChoreForm
            initial={initial}
            submitLabel={submitLabel}
            onSave={async (draft) => {
              await onSave(draft)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChoreForm({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: ChoreDraft
  submitLabel: string
  onSave: (draft: ChoreDraft) => Promise<void>
  onCancel: () => void
}) {
  const id = React.useId()
  const [title, setTitle] = React.useState(initial.title)
  const [reward, setReward] = React.useState(String(initial.doubloons))
  const [items, setItems] = React.useState(() =>
    initial.items.map((item) => ({ ...item, key: item.id ?? key() }))
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [focusKey, setFocusKey] = React.useState<string | null>(null)
  const inputs = React.useRef(new Map<string, HTMLInputElement>())

  React.useEffect(() => {
    if (focusKey) inputs.current.get(focusKey)?.focus()
  }, [focusKey, items])

  const rewardValue = Number(reward)
  const rewardOk =
    reward.trim() !== "" &&
    Number.isInteger(rewardValue) &&
    rewardValue >= 0 &&
    rewardValue <= MAX_REWARD

  const addAfter = (index: number) => {
    const k = key()
    setItems((prev) => [
      ...prev.slice(0, index + 1),
      { label: "", key: k },
      ...prev.slice(index + 1),
    ])
    setFocusKey(k)
  }
  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setFocusKey(items[index - 1]?.key ?? null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError("Giv tjansen et navn, matros.")
    if (!rewardOk) return setError("Brug et helt tal fra 0 til 10.000.")
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        doubloons: rewardValue,
        items: items
          .filter((item) => item.label.trim())
          .map((item) => ({ id: item.id, label: item.label.trim() })),
      })
    } catch (err) {
      console.error("[chores] could not save chore", err)
      setError("Arrh, tjansen kunne ikke gemmes. Prøv igen.")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-title`}>Navn</Label>
          <Input
            id={`${id}-title`}
            value={title}
            autoFocus
            maxLength={120}
            placeholder="Skrub badeværelset"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-reward`}>Dubloner</Label>
          <Input
            id={`${id}-reward`}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_REWARD}
            value={reward}
            aria-invalid={!rewardOk || undefined}
            onChange={(e) => setReward(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">
          Tjekliste{" "}
          <span className="font-normal text-muted-foreground">(valgfri)</span>
        </legend>
        {items.map((item, index) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <Input
              ref={(el) => {
                if (el) inputs.current.set(item.key, el)
                else inputs.current.delete(item.key)
              }}
              value={item.label}
              maxLength={200}
              aria-label={`Punkt ${index + 1} på tjeklisten`}
              placeholder="Hvad skal gøres?"
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((it, i) =>
                    i === index ? { ...it, label: e.target.value } : it
                  )
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addAfter(index)
                } else if (e.key === "Backspace" && item.label === "") {
                  e.preventDefault()
                  remove(index)
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Fjern ${item.label || "punkt"}`}
              onClick={() => remove(index)}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => addAfter(items.length - 1)}
        >
          <PlusIcon data-icon="inline-start" />
          Tilføj punkt
        </Button>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Fortryd
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          )}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
