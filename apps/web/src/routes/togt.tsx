import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { useVoyageTheme } from "@/components/chores/game/themes"
import { togtLinks, togtMeta } from "@/components/togt/head"
import { ProfileButton } from "@/components/togt/profile-picker"
import { WorldPicker } from "@/components/togt/world-picker"
import { getViewer } from "@/server/auth"

/**
 * The chores app: a full-screen game for the family, away from the admin
 * dashboard. Planning, the chore library and the crew stay in the dashboard.
 */
export const Route = createFileRoute("/togt")({
  head: () => ({
    meta: [{ title: "Tjansetogt" }, ...togtMeta],
    links: togtLinks,
  }),
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (viewer?.kind === "admin") throw redirect({ to: "/admin" })
    if (!viewer) throw redirect({ to: "/login" })
    return { viewer }
  },
  component: TogtApp,
})

function TogtApp() {
  const theme = useVoyageTheme()
  const { viewer } = Route.useRouteContext()
  return (
    <div className="tg-app" data-skin={theme.id}>
      <div className="tg-wrap">
        <header className="tg-topbar">
          <div className="tg-brand">
            <span aria-hidden className="tg-brand-mark">
              {theme.emoji}
            </span>
            <div>
              <h1>Tjansetogt</h1>
              <small>{viewer.family.name}</small>
            </div>
          </div>
          <div className="tg-topbar-r">
            <WorldPicker />
            <ProfileButton me={viewer.member} isParent={viewer.isParent} />
          </div>
        </header>
        <Outlet />
      </div>

      <nav className="tg-nav" aria-label="Tjansetogt">
        <Link to="/togt" activeOptions={{ exact: true }}>
          <span aria-hidden className="tg-ni">
            🗺️
          </span>
          Togtet
        </Link>
        <Link to="/togt/skat">
          <span aria-hidden className="tg-ni">
            🧰
          </span>
          Skatte
        </Link>
        <Link to="/togt/log">
          <span aria-hidden className="tg-ni">
            📜
          </span>
          Logbog
        </Link>
        {viewer.isParent && (
          <Link to="/chores/plan" search={{ week: "next" }}>
            <span aria-hidden className="tg-ni">
              🧭
            </span>
            Planlæg
          </Link>
        )}
      </nav>
    </div>
  )
}
