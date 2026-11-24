import * as React from "react"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"

import { togtLinks, togtMeta } from "@/components/togt/head"
import { adminLogin, getViewer } from "@/server/auth"
import { errorMessage } from "@/lib/errors"

/** The site admin's login. The credentials live in .env. */
export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin · Tjansetogt" }, ...togtMeta],
    links: togtLinks,
  }),
  beforeLoad: async () => {
    if ((await getViewer())?.kind === "admin") throw redirect({ to: "/admin" })
  },
  component: AdminLogin,
})

function AdminLogin() {
  const router = useRouter()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminLogin({ data: { username, password } })
      await router.navigate({ to: "/admin" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="tg-app" data-skin="spindelhelt">
      <main className="tg-auth">
        <form className="tg-panel tg-auth-card" onSubmit={submit}>
          <div className="tg-brand">
            <span aria-hidden className="tg-brand-mark">
              🛡️
            </span>
            <h1>Admin</h1>
          </div>
          <p>Opret og styr forældrekonti.</p>
          <label className="tg-field">
            Brugernavn
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
        </form>
      </main>
    </div>
  )
}
