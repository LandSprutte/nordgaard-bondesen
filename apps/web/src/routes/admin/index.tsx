import * as React from "react"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import {
  KeyRoundIcon,
  LogOutIcon,
  ShieldIcon,
  UserPlusIcon,
} from "lucide-react"

import { MemberAvatar } from "@/components/chores/member-avatar"
import {
  createParentAccount,
  getAdminOverview,
  resetParentPassword,
  setParentPlan,
} from "@/server/admin"
import { adminLogout, getViewer } from "@/server/auth"
import { Badge } from "@workspace/ui/components/badge"
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
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { errorMessage } from "@/lib/errors"

/** The site admin sets up parent accounts and families. */
export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin" }] }),
  beforeLoad: async () => {
    if ((await getViewer())?.kind !== "admin") {
      throw redirect({ to: "/admin/login" })
    }
  },
  loader: () => getAdminOverview(),
  component: AdminPage,
})

type Family = Awaited<ReturnType<typeof getAdminOverview>>[number]

const NEW_FAMILY = "__new__"

type Plan = "basic" | "pro"

function errorText(err: unknown) {
  return errorMessage(err, "Det gik galt. Prøv igen.")
}

function AdminPage() {
  const families = Route.useLoaderData()
  const router = useRouter()
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldIcon className="size-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Opret forældrekonti. Forældre tilføjer selv børn og medforældre.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await adminLogout()
            await router.navigate({ to: "/admin/login" })
          }}
        >
          <LogOutIcon data-icon="inline-start" />
          Log ud
        </Button>
      </header>

      <NewParent families={families} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Familier ({families.length})</h2>
        {families.map((family) => (
          <FamilyCard key={family.id} family={family} />
        ))}
      </section>
    </main>
  )
}

function NewParent({ families }: { families: Array<Family> }) {
  const router = useRouter()
  const id = React.useId()
  const empty = {
    name: "",
    email: "",
    password: "",
    familyId: NEW_FAMILY,
    familyName: "",
    plan: "basic" as Plan,
  }
  const [draft, setDraft] = React.useState(empty)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<{
    ok: boolean
    text: string
  } | null>(null)
  const isNew = draft.familyId === NEW_FAMILY

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await createParentAccount({
        data: {
          name: draft.name,
          email: draft.email,
          password: draft.password,
          plan: draft.plan,
          ...(isNew
            ? { familyName: draft.familyName }
            : { familyId: draft.familyId }),
        },
      })
      setMessage({
        ok: true,
        text: `${draft.name} kan nu logge ind med ${draft.email}.`,
      })
      setDraft(empty)
      await router.invalidate()
    } catch (err) {
      setMessage({ ok: false, text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  const field = (key: keyof typeof empty) => ({
    id: `${id}-${key}`,
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [key]: e.target.value }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opret forælder</CardTitle>
        <CardDescription>
          I en ny familie, eller som medforælder i en, der findes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-name`}>Navn</Label>
            <Input required maxLength={40} {...field("name")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              type="email"
              required
              autoComplete="off"
              {...field("email")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-password`}>Kodeord</Label>
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mindst 8 tegn"
              {...field("password")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-family`}>Familie</Label>
            <NativeSelect
              id={`${id}-family`}
              value={draft.familyId}
              onChange={(e) => setDraft({ ...draft, familyId: e.target.value })}
            >
              <NativeSelectOption value={NEW_FAMILY}>
                Ny familie…
              </NativeSelectOption>
              {families.map((f) => (
                <NativeSelectOption key={f.id} value={f.id}>
                  {f.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-plan`}>Abonnement</Label>
            <NativeSelect
              id={`${id}-plan`}
              value={draft.plan}
              onChange={(e) =>
                setDraft({ ...draft, plan: e.target.value as Plan })
              }
            >
              <NativeSelectOption value="basic">
                Basic: kun tjanser
              </NativeSelectOption>
              <NativeSelectOption value="pro">
                Pro: også overblik, budget og kalender
              </NativeSelectOption>
            </NativeSelect>
          </div>
          {isNew && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`${id}-familyName`}>Den nye families navn</Label>
              <Input
                required
                maxLength={80}
                placeholder="Fx Familien Hansen"
                {...field("familyName")}
              />
            </div>
          )}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              <UserPlusIcon data-icon="inline-start" />
              Opret forælder
            </Button>
            {message && (
              <p
                role={message.ok ? "status" : "alert"}
                className={
                  message.ok
                    ? "text-sm text-emerald-600"
                    : "text-sm text-destructive"
                }
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function FamilyCard({ family }: { family: Family }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{family.name}</CardTitle>
        <CardDescription>
          Oprettet {family.createdAt} · {family.members.length} medlemmer ·{" "}
          {family.chores} tjanser · {family.transactions} posteringer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {family.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen medlemmer endnu. Opret en forælder i familien ovenfor.
          </p>
        ) : (
          <ul className="divide-y">
            {family.members.map((member) => (
              <MemberLine key={member.id} member={member} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function MemberLine({ member }: { member: Family["members"][number] }) {
  const router = useRouter()
  const [resetting, setResetting] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [message, setMessage] = React.useState<string | null>(null)

  const reset = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await resetParentPassword({ data: { memberId: member.id, password } })
      setResetting(false)
      setPassword("")
      setMessage("Kodeordet er skiftet.")
    } catch (err) {
      setMessage(errorText(err))
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <MemberAvatar
        member={member}
        className={member.archived ? "opacity-50" : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 text-sm font-medium">
          {member.name}
          <Badge variant={member.role === "parent" ? "default" : "secondary"}>
            {member.role === "parent" ? "Forælder" : "Barn"}
          </Badge>
          {member.role === "parent" && (
            <Badge variant={member.plan === "pro" ? "default" : "outline"}>
              {member.plan === "pro" ? "Pro" : "Basic"}
            </Badge>
          )}
          {member.archived && <Badge variant="outline">Arkiveret</Badge>}
        </span>
        {member.email && (
          <span className="truncate text-xs text-muted-foreground">
            {member.email}
          </span>
        )}
        {message && (
          <span className="text-xs text-muted-foreground">{message}</span>
        )}
      </div>
      {member.role === "parent" && !resetting && (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const plan = member.plan === "pro" ? "basic" : "pro"
            try {
              await setParentPlan({ data: { memberId: member.id, plan } })
              setMessage(null)
              await router.invalidate()
            } catch (err) {
              setMessage(errorText(err))
            }
          }}
        >
          {member.plan === "pro" ? "Skift til Basic" : "Opgradér til Pro"}
        </Button>
      )}
      {member.role === "parent" &&
        (resetting ? (
          <form onSubmit={reset} className="flex gap-2">
            <Input
              type="password"
              autoFocus
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Nyt kodeord"
              aria-label={`Nyt kodeord til ${member.name}`}
              className="w-40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" size="sm">
              Gem
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setResetting(false)}
            >
              Fortryd
            </Button>
          </form>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setResetting(true)}>
            <KeyRoundIcon data-icon="inline-start" />
            Nyt kodeord
          </Button>
        ))}
    </li>
  )
}
