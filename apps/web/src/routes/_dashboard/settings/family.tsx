import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  CheckIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react"

import { PageHeader } from "@/components/budget/page-header"
import { MemberAvatar } from "@/components/chores/member-avatar"
import { MEMBER_COLORS, MEMBER_EMOJIS } from "@/lib/chores"
import {
  createMember,
  listMembers,
  removeMember,
  restoreMember,
  updateMember,
} from "@/server/members"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/_dashboard/settings/family")({
  staticData: { title: "Besætningen" },
  loader: () => listMembers(),
  component: FamilySettings,
})

type Role = "parent" | "child"
type Draft = {
  name: string
  color: string
  emoji: string
  role: Role
  email?: string
  password?: string
}
type Member = Awaited<ReturnType<typeof listMembers>>["members"][number]

const ROLE_LABEL: Record<Role, string> = { parent: "Forælder", child: "Barn" }

function errorText(err: unknown) {
  return errorMessage(err, "Arrh, det kunne ikke gemmes. Prøv igen.")
}

function FamilySettings() {
  const { members, me } = Route.useLoaderData()
  const router = useRouter()
  const [adding, setAdding] = React.useState(false)
  const active = members.filter((m) => !m.archived)
  const archived = members.filter((m) => m.archived)
  // Suggest a colour and emoji nobody has yet.
  const fresh: Draft = {
    name: "",
    role: "child",
    color:
      MEMBER_COLORS.find((c) => !active.some((m) => m.color === c)) ??
      MEMBER_COLORS[0],
    emoji:
      MEMBER_EMOJIS.find((e) => !active.some((m) => m.emoji === e)) ??
      MEMBER_EMOJIS[0],
  }

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeader
        title="Besætningen"
        description="Alle i familien spiller med. Forældre logger ind med email og kodeord og styrer resten af dashboardet; børn vælger sig selv i Tjansetogt på en enhed, en forælder har logget ind på."
      >
        <Button onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          Tilføj barn eller forælder
        </Button>
      </PageHeader>

      <MemberDialog
        open={adding}
        onOpenChange={setAdding}
        heading="Tilføj til familien"
        initial={fresh}
        isNew
        submitLabel="Tilføj"
        onSave={async (draft) => {
          await createMember({ data: draft })
          await router.invalidate()
        }}
      />

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <UsersIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Ingen besætning endnu</p>
            <p className="text-sm text-muted-foreground">
              Mønstr alle der giver en hånd med ombord.
            </p>
          </div>
        </div>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {active.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isMe={member.id === me}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {archived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gået i land</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {archived.map((member) => (
                <ArchivedRow key={member.id} member={member} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MemberRow({ member, isMe }: { member: Member; isMe: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const remove = async () => {
    try {
      await removeMember({ data: { id: member.id } })
      await router.invalidate()
    } catch (err) {
      console.error("[family] could not remove member", err)
      setError(errorText(err))
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <MemberAvatar member={member} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 font-medium">
          {member.name}
          {isMe && <span className="text-muted-foreground">(dig)</span>}
          <Badge variant={member.role === "parent" ? "default" : "secondary"}>
            {ROLE_LABEL[member.role]}
          </Badge>
        </span>
        {member.email && (
          <span className="truncate text-sm text-muted-foreground">
            {member.email}
          </span>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Redigér ${member.name}`}
        onClick={() => setEditing(true)}
      >
        <PencilIcon />
      </Button>
      {isMe ? null : confirming ? (
        <Button
          variant="destructive"
          size="sm"
          autoFocus
          onBlur={() => setConfirming(false)}
          onClick={() => void remove()}
        >
          Sæt i land
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          Sæt i land
        </Button>
      )}
      <MemberDialog
        open={editing}
        onOpenChange={setEditing}
        heading={`Redigér ${member.name}`}
        initial={{ ...member, email: member.email ?? undefined }}
        isMe={isMe}
        submitLabel="Gem"
        onSave={async (draft) => {
          await updateMember({ data: { id: member.id, ...draft } })
          await router.invalidate()
        }}
      />
    </li>
  )
}

function ArchivedRow({ member }: { member: Member }) {
  const router = useRouter()
  return (
    <li className="flex items-center gap-3">
      <MemberAvatar member={member} size="sm" className="opacity-60" />
      <span className="flex-1 text-sm text-muted-foreground">
        {member.name}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await restoreMember({ data: { id: member.id } })
          await router.invalidate()
        }}
      >
        Mønstr igen
      </Button>
    </li>
  )
}

function MemberDialog({
  open,
  onOpenChange,
  heading,
  initial,
  isNew = false,
  isMe = false,
  submitLabel,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  heading: string
  initial: Draft
  isNew?: boolean
  isMe?: boolean
  submitLabel: string
  onSave: (draft: Draft) => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            Børn spiller uden kodeord. En medforælder får sin egen email og sit
            eget kodeord.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <MemberForm
            initial={initial}
            isNew={isNew}
            isMe={isMe}
            submitLabel={submitLabel}
            onCancel={() => onOpenChange(false)}
            onSave={async (draft) => {
              await onSave(draft)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({
  initial,
  isNew,
  isMe,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: Draft
  isNew: boolean
  isMe: boolean
  submitLabel: string
  onSave: (draft: Draft) => Promise<void>
  onCancel: () => void
}) {
  const id = React.useId()
  const [draft, setDraft] = React.useState<Draft>({
    name: initial.name,
    color: initial.color,
    emoji: initial.emoji,
    role: initial.role,
    email: initial.email ?? "",
    password: "",
  })
  // A parent already has a password; a new parent needs one.
  const needsPassword = draft.role === "parent" && initial.role !== "parent"
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const emojis = MEMBER_EMOJIS.some((e) => e === draft.emoji)
    ? MEMBER_EMOJIS
    : [draft.emoji, ...MEMBER_EMOJIS]

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) return setError("Skriv et navn.")
    const parent = draft.role === "parent"
    if (parent && !draft.email?.trim()) {
      return setError("En forælder skal have en email.")
    }
    if (needsPassword && !draft.password) {
      return setError("En forælder skal have et kodeord.")
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: draft.name.trim(),
        color: draft.color,
        emoji: draft.emoji,
        role: draft.role,
        email: parent ? draft.email?.trim() : undefined,
        password: parent && draft.password ? draft.password : undefined,
      })
    } catch (err) {
      console.error("[family] could not save member", err)
      setError(errorText(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <MemberAvatar
          member={{ ...draft, name: draft.name || "Forhåndsvisning" }}
          size="lg"
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>Navn</Label>
          <Input
            id={`${id}-name`}
            value={draft.name}
            autoFocus
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Rolle</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["child", "parent"] as const).map((role) => (
            <Button
              key={role}
              type="button"
              variant={draft.role === role ? "default" : "outline"}
              aria-pressed={draft.role === role}
              disabled={isMe && role === "child"}
              onClick={() => setDraft({ ...draft, role })}
            >
              {role === "child" ? "🧒 Barn" : "🧑 Forælder"}
            </Button>
          ))}
        </div>
      </fieldset>

      {draft.role === "parent" && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="off"
              value={draft.email}
              maxLength={200}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-password`}>
              {needsPassword || isNew ? "Kodeord" : "Nyt kodeord"}
            </Label>
            <Input
              id={`${id}-password`}
              type="password"
              autoComplete="new-password"
              placeholder={needsPassword || isNew ? "Mindst 8 tegn" : "Uændret"}
              value={draft.password}
              maxLength={200}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            />
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Farve</legend>
        <div className="flex flex-wrap gap-2">
          {MEMBER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={draft.color === color}
              onClick={() => setDraft({ ...draft, color })}
              className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ backgroundColor: color }}
            >
              {draft.color === color && (
                <CheckIcon className="size-4 text-white" />
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Emoji</legend>
        <div className="flex flex-wrap gap-1.5">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={draft.emoji === emoji}
              onClick={() => setDraft({ ...draft, emoji })}
              className={cn(
                "flex size-9 items-center justify-center rounded-md border text-xl outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                draft.emoji === emoji &&
                  "border-primary bg-muted ring-1 ring-primary"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
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
