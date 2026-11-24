import * as React from "react"
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router"

import { useVoyageTheme } from "@/components/chores/game/themes"
import { togtLinks, togtMeta } from "@/components/togt/head"
import { getViewer, login } from "@/server/auth"
import { errorMessage } from "@/lib/errors"

/** Parents log a device in to their family here. */
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Log ind · Tjansetogt" }, ...togtMeta],
    links: togtLinks,
  }),
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (viewer?.kind === "family") {
      throw redirect({ to: viewer.isPro ? "/" : "/togt" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const theme = useVoyageTheme()
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login({ data: { email, password } })
      await router.navigate({ to: "/togt" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="tg-app" data-skin={theme.id}>
      <main className="tg-auth">
        <form className="tg-panel tg-auth-card" onSubmit={submit}>
          <div className="tg-brand">
            <span aria-hidden className="tg-brand-mark">
              {theme.emoji}
            </span>
            <h1>Tjansetogt</h1>
          </div>
          <p>
            Log ind som forælder. Bagefter kan børnene vælge sig selv på
            enheden.
          </p>
          <label className="tg-field">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="tg-field">
            Kodeord
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="tg-error">
              {error}
            </p>
          )}
          <button type="submit" className="tg-btn is-wide" disabled={busy}>
            {busy ? "Logger ind…" : "Log ind"}
          </button>
          <p className="tg-small">
            Ingen konto? Spørg den, der driver siden.{" "}
            <Link to="/admin/login">Admin</Link>
          </p>
        </form>
      </main>
    </div>
  )
}
