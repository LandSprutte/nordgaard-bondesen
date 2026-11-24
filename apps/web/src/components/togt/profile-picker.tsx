import * as React from "react"
import { useRouter } from "@tanstack/react-router"

import { listProfiles, logout, switchProfile } from "@/server/auth"
import { errorMessage } from "@/lib/errors"

type Profile = Awaited<ReturnType<typeof listProfiles>>["members"][number]

/**
 * Who is playing on this device. Tap to hand it to someone else: children
 * switch in straight away, parents type their password.
 */
export function ProfileButton({
  me,
  isParent,
}: {
  me: { name: string; emoji: string; color: string }
  isParent: boolean
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        className="tg-me"
        style={{ "--mc": me.color } as React.CSSProperties}
        onClick={() => setOpen(true)}
        aria-label={`${me.name} spiller. Skift spiller`}
      >
        <em aria-hidden>{me.emoji}</em>
        <span>
          <small>{isParent ? "Forælder" : "Spiller"}</small>
          {me.name}
        </span>
      </button>
      {open && (
        <ProfileSheet isParent={isParent} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function ProfileSheet({
  isParent,
  onClose,
}: {
  isParent: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [data, setData] = React.useState<Awaited<
    ReturnType<typeof listProfiles>
  > | null>(null)
  const [asking, setAsking] = React.useState<Profile | null>(null)
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    listProfiles()
      .then(setData)
      .catch((err: unknown) => {
        console.error("[togt] could not list profiles", err)
        setError("Kunne ikke hente familien.")
      })
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const become = async (profile: Profile, withPassword?: string) => {
    setBusy(true)
    setError(null)
    try {
      await switchProfile({
        data: { memberId: profile.id, password: withPassword },
      })
      onClose()
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const pick = (profile: Profile) => {
    if (profile.id === data?.current) return onClose()
    if (profile.role === "parent") {
      setAsking(profile)
      setPassword("")
      setError(null)
      return
    }
    void become(profile)
  }

  return (
    <div
      className="tg-sheet"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="tg-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profiles-h"
      >
        <div className="tg-sec-h">
          <h2 id="profiles-h">
            {asking ? `Hej ${asking.name}!` : "Hvem spiller?"}
          </h2>
        </div>

        {asking ? (
          <form
            className="tg-sec"
            onSubmit={(e) => {
              e.preventDefault()
              void become(asking, password)
            }}
          >
            <label className="tg-field">
              Dit kodeord
              <input
                type="password"
                autoFocus
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="tg-error">
                {error}
              </p>
            )}
            <div className="tg-sheet-foot">
              <button
                type="button"
                className="tg-link-btn"
                onClick={() => setAsking(null)}
              >
                ← Tilbage
              </button>
              <button type="submit" className="tg-btn" disabled={busy}>
                Skift til {asking.name}
              </button>
            </div>
          </form>
        ) : (
          <>
            {data ? (
              <ul className="tg-profiles">
                {data.members.map((profile) => (
                  <li key={profile.id}>
                    <button
                      type="button"
                      className="tg-profile"
                      disabled={busy}
                      aria-current={profile.id === data.current}
                      style={{ "--mc": profile.color } as React.CSSProperties}
                      onClick={() => pick(profile)}
                    >
                      <em aria-hidden>{profile.emoji}</em>
                      {profile.name}
                      <small>
                        {profile.role === "parent" ? "🔒 Forælder" : "Barn"}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !error && <p className="tg-small">Henter familien…</p>
            )}
            {error && (
              <p role="alert" className="tg-error">
                {error}
              </p>
            )}
            <div className="tg-sheet-foot">
              <button type="button" className="tg-link-btn" onClick={onClose}>
                Luk
              </button>
              {isParent && (
                <button
                  type="button"
                  className="tg-link-btn"
                  onClick={async () => {
                    await logout()
                    await router.navigate({ to: "/login" })
                  }}
                >
                  Log enheden ud
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
